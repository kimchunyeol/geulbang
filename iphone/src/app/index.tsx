import { Link, router, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { addFolder, deleteFolder, liveStories, postsOf, updateStory } from '@/data/store';
import type { Story } from '@/data/types';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';

export default function StoriesScreen() {
  const data = useStore();
  const c = useColors();
  const stories = liveStories(data);
  const folders = [...data.folders].sort((a, b) => a.rank - b.rank);
  const loose = stories.filter(s => !s.folderId || !folders.some(f => f.id === s.folderId));

  const newFolder = () =>
    Alert.prompt('새 폴더', '폴더 이름을 입력해주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '추가', onPress: (v?: string) => { if (v?.trim()) addFolder(v.trim()); } },
    ], 'plain-text');

  const confirmDeleteFolder = (id: string, title: string) =>
    Alert.alert(`'${title}' 폴더 삭제`, '폴더를 삭제해도 안의 이야기는 그대로 남아요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteFolder(id) },
    ]);

  const row = (s: Story) => (
    <Link key={s.id} href={{ pathname: '/story/[id]', params: { id: s.id } }} asChild>
      <Link.Trigger>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <View style={{ paddingVertical: 16, gap: 4, borderBottomWidth: 0.5, borderBottomColor: c.line }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.serifBold, fontSize: 18, color: c.ink }}>{s.title}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: c.muted }}>
              {s.subtitle ? `${s.subtitle} · ` : ''}글 {postsOf(data, s).length}개
            </Text>
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction title="이야기 수정" icon="pencil"
          onPress={() => router.push({ pathname: '/story-form', params: { id: s.id } })} />
        <Link.MenuAction title="휴지통으로" icon="trash" destructive
          onPress={() => updateStory(s.id, { trashedAt: Date.now() })} />
      </Link.Menu>
    </Link>
  );

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="gearshape" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="magnifyingglass" onPress={() => router.push('/search')} />
        <Stack.Toolbar.Menu icon="plus">
          <Stack.Toolbar.MenuAction icon="book" onPress={() => router.push('/story-form')}>새 이야기</Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="folder.badge.plus" onPress={newFolder}>새 폴더</Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" onPress={() => router.push('/trash')}>휴지통</Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        {loose.map(row)}
        {folders.map(f => (
          <View key={f.id}>
            <Pressable onLongPress={() => confirmDeleteFolder(f.id, f.title)}
              style={{ paddingTop: 28, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted, letterSpacing: 0.8 }}>{f.title}</Text>
              <Text style={{ fontSize: 11, color: c.muted }}>길게 눌러 삭제</Text>
            </Pressable>
            {stories.filter(s => s.folderId === f.id).map(row)}
            {!stories.some(s => s.folderId === f.id) ? (
              <Text style={{ fontSize: 13, color: c.muted, paddingVertical: 12 }}>비어 있음</Text>
            ) : null}
          </View>
        ))}
        {!stories.length ? (
          <View style={{ paddingVertical: 80, alignItems: 'center', gap: 16 }}>
            <Text style={{ color: c.muted, textAlign: 'center', lineHeight: 22 }}>{'이야기가 없어요.\n첫 이야기를 만들어 보세요.'}</Text>
            <Pressable onPress={() => router.push('/story-form')}>
              <Text style={{ color: c.accent, fontSize: 16 }}>＋ 새 이야기</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
