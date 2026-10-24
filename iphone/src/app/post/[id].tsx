import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoUri } from '@/data/photos';
import { trashPost, updateSettings } from '@/data/store';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';
import { countLabel, formatDate } from '@/utils/format';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const lastTap = useRef(0);
  const post = data.posts.find(p => p.id === id);
  const story = post && data.stories.find(s => s.id === post.storyId);

  if (!post) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.muted }}>이 글을 찾을 수 없어요.</Text>
      </View>
    );
  }

  const edit = () => router.push({ pathname: '/edit/[id]', params: { id: post.id } });
  // 본문을 두 번 탭하면 수정 (원본 PenCake와 같은 동작)
  const onBodyPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) edit();
    lastTap.current = now;
  };
  const confirmTrash = () =>
    Alert.alert('이 글 삭제하기', '삭제한 글은 휴지통에 30일간 보관됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { trashPost(post.id); router.back(); } },
    ]);
  const align = post.align === 'center' ? 'center' : post.align === 'justify' ? 'justify' : 'left';
  const fs = data.settings.fontSize;

  return (
    <>
      <Stack.Screen options={{ title: story?.title ?? '' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction icon="square.and.arrow.up"
            onPress={() => Share.share({ message: `${post.title}\n\n${post.text}` })}>
            텍스트 공유
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={confirmTrash}>이 글 삭제하기</Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="pencil" onPress={edit} />
      </Stack.Toolbar>

      <ScrollView contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 80, gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          {story?.dateVisible !== false ? (
            <Text style={{ fontSize: 12, color: c.muted, letterSpacing: 0.4 }}>{formatDate(post.writedAt)}</Text>
          ) : null}
          <Text selectable style={{ fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 34, color: c.ink, textAlign: 'center' }}>
            {post.title || '제목 없음'}
          </Text>
        </View>

        {post.photos.length ? (
          <View style={{ gap: 8 }}>
            <Pressable onPress={() => router.push({ pathname: '/photo', params: { name: post.photos[0] } })}>
              <Image source={{ uri: photoUri(post.photos[0]) }} contentFit="cover" transition={150}
                style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 10, borderCurve: 'continuous', backgroundColor: c.panel }} />
            </Pressable>
            {post.photos.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {post.photos.slice(1).map(name => (
                  <Pressable key={name} onPress={() => router.push({ pathname: '/photo', params: { name } })}
                    style={{ width: '31.5%', aspectRatio: 1 }}>
                    <Image source={{ uri: photoUri(name) }} contentFit="cover"
                      style={{ flex: 1, borderRadius: 8, borderCurve: 'continuous', backgroundColor: c.panel }} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable onPress={onBodyPress}>
          <Text selectable style={{ fontFamily: fonts.serif, fontSize: fs, lineHeight: fs * 1.9, color: c.ink, textAlign: align }}>
            {post.text || ' '}
          </Text>
        </Pressable>
        <Text style={{ fontSize: 11, color: c.muted, textAlign: 'center' }}>두 번 탭하면 글을 수정할 수 있어요</Text>
      </ScrollView>

      <Pressable onPress={() => updateSettings({ countMode: (data.settings.countMode + 1) % 3 })}
        style={{ position: 'absolute', right: 20, bottom: insets.bottom + 12, backgroundColor: c.panel,
          borderColor: c.line, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontSize: 12, color: c.muted, fontVariant: ['tabular-nums'] }}>
          {countLabel(post.text, data.settings.countMode)}
        </Text>
      </Pressable>
    </>
  );
}
