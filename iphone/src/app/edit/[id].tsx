import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { pickPhotos, photoUri } from '@/data/photos';
import { discardIfEmpty, store, updatePost } from '@/data/store';
import type { Align } from '@/data/types';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';
import { countLabel } from '@/utils/format';

const ALIGNS: { value: Align; label: string; icon: 'text.alignleft' | 'text.aligncenter' | 'text.justify' }[] = [
  { value: 'left', label: '왼쪽 정렬', icon: 'text.alignleft' },
  { value: 'center', label: '가운데 정렬', icon: 'text.aligncenter' },
  { value: 'justify', label: '양쪽 정렬', icon: 'text.justify' },
];

export default function EditScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const data = useStore();
  const c = useColors();
  const post = data.posts.find(p => p.id === id);

  // 입력 중인 제목·본문은 화면에 두고, 잠깐 멈추면 저장
  const [title, setTitle] = useState(post?.title ?? '');
  const [text, setText] = useState(post?.text ?? '');
  const pending = useRef<{ title: string; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) {
      updatePost(id, { ...pending.current, editedAt: Date.now() });
      pending.current = null;
    }
  };
  const queueSave = (next: { title: string; text: string }) => {
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };

  // 화면을 떠날 때(뒤로 가기 포함) 마지막 입력 저장, 빈 새 글은 지움
  useEffect(() => {
    const timerRef = timer;
    const pendingRef = pending;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) updatePost(id, { ...pendingRef.current, editedAt: Date.now() });
      pendingRef.current = null;
      discardIfEmpty(id);
    };
  }, [id]);

  if (!post) return null;

  const done = () => {
    flush();
    if (discardIfEmpty(id)) return router.back();
    if (fresh) router.replace({ pathname: '/post/[id]', params: { id } });
    else router.back();
  };

  const addPhotos = async () => {
    const names = await pickPhotos();
    const current = store.get().posts.find(p => p.id === id);
    if (names.length && current) updatePost(id, { photos: [...current.photos, ...names] });
  };
  const makeCover = (name: string) => updatePost(id, { photos: [name, ...post.photos.filter(n => n !== name)] });
  const removePhoto = (name: string) => updatePost(id, { photos: post.photos.filter(n => n !== name) });

  const fs = data.settings.fontSize;
  const align = post.align === 'justify' ? 'justify' : post.align;

  return (
    <>
      <Stack.Screen options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ALIGNS.find(a => a.value === post.align)?.icon ?? 'text.alignleft'}>
          {ALIGNS.map(a => (
            <Stack.Toolbar.MenuAction key={a.value} icon={a.icon} onPress={() => updatePost(id, { align: a.value })}>
              {a.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="photo.badge.plus" onPress={addPhotos} />
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" tintColor={c.accent} onPress={done} />
      </Stack.Toolbar>

      <ScrollView contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 18 }}>
        <View style={{ alignItems: 'center' }}>
          <DateTimePicker value={new Date(post.writedAt)} mode="datetime" display="compact" locale="ko-KR"
            accentColor={c.accent as string}
            onValueChange={(_e, d) => updatePost(id, { writedAt: d.getTime() })} />
        </View>

        <TextInput value={title} placeholder="제목" placeholderTextColor={c.muted} autoFocus={!post.title && !post.text}
          onChangeText={v => { setTitle(v); queueSave({ title: v, text }); }}
          style={{ fontFamily: fonts.serifBold, fontSize: 24, color: c.ink, textAlign: 'center', paddingVertical: 4 }} />

        {post.photos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8 }}>
            {post.photos.map((name, i) => (
              <View key={name} style={{ width: 84, height: 84 }}>
                <Pressable onPress={() => makeCover(name)}>
                  <Image source={{ uri: photoUri(name) }} contentFit="cover"
                    style={{ width: 84, height: 84, borderRadius: 8, borderCurve: 'continuous',
                      borderWidth: i === 0 ? 2 : 0, borderColor: c.accent, backgroundColor: c.panel }} />
                </Pressable>
                <Pressable onPress={() => removePhoto(name)} hitSlop={8} accessibilityLabel="사진 빼기"
                  style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
                    backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.background, fontSize: 13, lineHeight: 15 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        {post.photos.length > 1 ? (
          <Text style={{ fontSize: 11, color: c.muted }}>테두리 있는 사진이 커버예요. 다른 사진을 누르면 커버가 돼요.</Text>
        ) : null}

        <TextInput value={text} placeholder="이곳에 글을 쓰세요" placeholderTextColor={c.muted} multiline scrollEnabled={false}
          onChangeText={v => { setText(v); queueSave({ title, text: v }); }}
          style={{ fontFamily: fonts.serif, fontSize: fs, lineHeight: fs * 1.9, color: c.ink, textAlign: align,
            minHeight: 320, textAlignVertical: 'top' }} />
        <Text style={{ fontSize: 12, color: c.muted, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          {countLabel(text, data.settings.countMode)}
        </Text>
      </ScrollView>
    </>
  );
}
