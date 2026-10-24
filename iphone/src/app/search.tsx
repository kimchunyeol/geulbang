import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { useStore } from '@/hooks/use-store';
import { useColors } from '@/theme/colors';

// 검색어 주변만 잘라 미리보기로 보여준다
function snippet(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text.slice(0, 120);
  return (i > 30 ? '…' : '') + text.slice(Math.max(0, i - 30), i + 90);
}

export default function SearchScreen() {
  const data = useStore();
  const c = useColors();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const live = new Map(data.stories.filter(s => !s.trashedAt).map(s => [s.id, s]));
  const results = q
    ? data.posts
        .filter(p => !p.trashedAt && live.has(p.storyId) &&
          (p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)))
        .sort((a, b) => b.writedAt - a.writedAt)
    : [];

  return (
    <>
      <Stack.Screen options={{ title: '검색' }} />
      <Stack.SearchBar placeholder="모든 이야기에서 검색" autoFocus hideWhenScrolling={false}
        onChangeText={e => setQuery(e.nativeEvent.text)} />
      <FlatList
        data={results}
        keyExtractor={p => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <PostCard post={item} showDate caption={live.get(item.storyId)?.title} preview={snippet(item.text, q)} />
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ color: c.muted }}>{q ? '검색 결과가 없어요.' : '제목이나 본문에 들어간 말을 찾아요.'}</Text>
          </View>
        }
      />
    </>
  );
}
