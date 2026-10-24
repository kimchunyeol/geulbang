import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { addStory, updateStory } from '@/data/store';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';

export default function StoryFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useStore();
  const c = useColors();
  const story = id ? data.stories.find(s => s.id === id) : undefined;

  const [title, setTitle] = useState(story?.title ?? '');
  const [subtitle, setSubtitle] = useState(story?.subtitle ?? '');
  const [folderId, setFolderId] = useState<string | null>(story?.folderId ?? null);

  const save = () => {
    const t = title.trim();
    if (!t) return;
    if (story) {
      updateStory(story.id, { title: t, subtitle: subtitle.trim(), folderId });
      router.back();
    } else {
      const s = addStory({ title: t, subtitle: subtitle.trim(), folderId });
      router.dismiss();
      router.push({ pathname: '/story/[id]', params: { id: s.id } });
    }
  };

  const input = { fontSize: 17, color: c.ink, backgroundColor: c.panel, borderRadius: 10, borderCurve: 'continuous' as const,
    paddingHorizontal: 14, paddingVertical: 12 };
  const chip = (key: string, label: string, value: string | null) => {
    const on = folderId === value;
    return (
      <Pressable key={key} onPress={() => setFolderId(value)}
        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 0.5,
          borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
        <Text style={{ fontSize: 14, color: on ? '#fff' : c.ink }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: story ? '이야기 수정' : '새 이야기' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={() => router.back()} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" tintColor={c.accent} disabled={!title.trim()} onPress={save} />
      </Stack.Toolbar>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ fontSize: 13, color: c.muted, lineHeight: 20 }}>
          {'이야기의 제목과 소제목을 입력해주세요.\n다짐말을 써도 좋아요.'}
        </Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="제목" placeholderTextColor={c.muted}
          autoFocus={!story} returnKeyType="next" style={[input, { fontFamily: fonts.serifBold }]} />
        <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="소제목" placeholderTextColor={c.muted}
          returnKeyType="done" onSubmitEditing={save} style={[input, { fontFamily: fonts.serif }]} />
        {data.folders.length ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted }}>폴더</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {chip('none', '폴더 없음', null)}
              {data.folders.map(f => chip(f.id, f.title, f.id))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
