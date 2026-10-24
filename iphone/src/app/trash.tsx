import { Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { daysLeft, emptyTrash, purgePosts, restorePost, TRASH_DAYS, updateStory } from '@/data/store';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';

export default function TrashScreen() {
  const data = useStore();
  const c = useColors();
  const stories = data.stories.filter(s => s.trashedAt);
  const posts = data.posts.filter(p => p.trashedAt).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0));
  const storyTitle = (id: string) => data.stories.find(s => s.id === id)?.title ?? '';

  const confirmEmpty = () =>
    Alert.alert('휴지통 비우기', '휴지통의 모든 항목을 영구 삭제합니다. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '비우기', style: 'destructive', onPress: emptyTrash },
    ]);

  const item = (key: string, meta: string, title: string, actions: { label: string; onPress: () => void; danger?: boolean }[]) => (
    <View key={key} style={{ paddingVertical: 16, gap: 6, borderBottomWidth: 0.5, borderBottomColor: c.line }}>
      <Text style={{ fontSize: 12, color: c.muted }}>{meta}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.serifBold, fontSize: 16, color: c.ink }}>{title}</Text>
      <View style={{ flexDirection: 'row', gap: 20, paddingTop: 4 }}>
        {actions.map(a => (
          <Pressable key={a.label} onPress={a.onPress} hitSlop={8}>
            <Text style={{ color: a.danger ? c.danger : c.accent, fontSize: 14 }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: '휴지통' }} />
      {stories.length || posts.length ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon="trash.slash" tintColor={c.danger} onPress={confirmEmpty} />
        </Stack.Toolbar>
      ) : null}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        <Text style={{ fontSize: 13, color: c.muted, paddingVertical: 12 }}>
          삭제한 글과 이야기는 {TRASH_DAYS}일간 보관된 뒤 영구 삭제됩니다.
        </Text>
        {stories.map(s => item(s.id, `이야기 · ${daysLeft(s.trashedAt!)}일 남음`, s.title, [
          { label: '복원', onPress: () => updateStory(s.id, { trashedAt: null }) },
        ]))}
        {posts.map(p => item(p.id, `${storyTitle(p.storyId)} · ${daysLeft(p.trashedAt!)}일 남음`, p.title || '제목 없음', [
          { label: '복원', onPress: () => restorePost(p.id) },
          { label: '영구 삭제', danger: true, onPress: () => purgePosts([p.id]) },
        ]))}
        {!stories.length && !posts.length ? (
          <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 60 }}>휴지통이 비어 있어요.</Text>
        ) : null}
      </ScrollView>
    </>
  );
}
