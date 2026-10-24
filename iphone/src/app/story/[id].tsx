import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { addPost, postsOf, updateStory } from '@/data/store';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';
import { formatDate } from '@/utils/format';

const SORTS = [
  { label: '최신 글 먼저', orderBy: 'writedAt', orderDir: 'desc' },
  { label: '오래된 글 먼저', orderBy: 'writedAt', orderDir: 'asc' },
  { label: '제목 가나다순', orderBy: 'title', orderDir: 'asc' },
  { label: '제목 역순', orderBy: 'title', orderDir: 'desc' },
] as const;

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore();
  const c = useColors();
  const story = data.stories.find(s => s.id === id && !s.trashedAt);

  if (!story) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={{ color: c.muted }}>이 이야기를 찾을 수 없어요.</Text>
      </View>
    );
  }

  const posts = postsOf(data, story);
  const newPost = () => {
    const p = addPost(story.id);
    router.push({ pathname: '/edit/[id]', params: { id: p.id, fresh: '1' } });
  };

  return (
    <>
      <Stack.Screen options={{ title: story.title }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.Menu title="정렬" icon="arrow.up.arrow.down">
            {SORTS.map(s => (
              <Stack.Toolbar.MenuAction key={s.label}
                icon={story.orderBy === s.orderBy && story.orderDir === s.orderDir ? 'checkmark' : undefined}
                onPress={() => updateStory(story.id, { orderBy: s.orderBy, orderDir: s.orderDir })}>
                {s.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.MenuAction icon={story.dateVisible ? 'calendar.badge.minus' : 'calendar.badge.plus'}
            onPress={() => updateStory(story.id, { dateVisible: !story.dateVisible })}>
            {story.dateVisible ? '글 날짜 숨기기' : '글 날짜 보이기'}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="pencil"
            onPress={() => router.push({ pathname: '/story-form', params: { id: story.id } })}>
            이야기 수정
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" destructive
            onPress={() => { updateStory(story.id, { trashedAt: Date.now() }); router.back(); }}>
            이야기를 휴지통으로
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="square.and.pencil" onPress={newPost} />
      </Stack.Toolbar>

      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            {story.subtitle ? (
              <Text style={{ fontFamily: fonts.serif, fontSize: 15, color: c.muted, textAlign: 'center' }}>{story.subtitle}</Text>
            ) : null}
            <Text style={{ fontSize: 12, color: c.muted }}>{formatDate(story.createdAt)} 시작 · 글 {posts.length}개</Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} showDate={story.dateVisible} />}
        ListEmptyComponent={
          <Pressable onPress={newPost} style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
            <Text style={{ color: c.muted }}>아직 글이 없어요.</Text>
            <Text style={{ color: c.accent, fontSize: 16 }}>첫 글 쓰기</Text>
          </Pressable>
        }
      />
    </>
  );
}
