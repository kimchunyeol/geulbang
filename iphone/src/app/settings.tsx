import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { applyBackup, exportBackup, pickBackup, summarize } from '@/data/backup';
import { updateSettings } from '@/data/store';
import { useStore } from '@/hooks/use-store';
import { fonts, useColors } from '@/theme/colors';

const SIZES = [15, 16, 17, 18, 20, 22];

export default function SettingsScreen() {
  const data = useStore();
  const c = useColors();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); }
    catch (e) { Alert.alert(`${label} 실패`, e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  const restore = () => run('백업 불러오기', async () => {
    const backup = await pickBackup();
    if (!backup) return;
    const s = summarize(backup);
    await new Promise<void>(resolve => Alert.alert(
      '백업에서 복원',
      `이야기 ${s.stories}개, 글 ${s.posts}개, 사진 ${s.photos}장이 들어 있어요.\n지금 이 아이폰의 글은 모두 백업 내용으로 바뀝니다.`,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve() },
        { text: '복원', style: 'destructive', onPress: () => {
          applyBackup(backup);
          Alert.alert('복원했어요', '백업의 글과 사진을 불러왔어요.');
          resolve();
        } },
      ],
    ));
  });

  const section = (title: string, children: React.ReactNode, note?: string) => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted, letterSpacing: 0.6, paddingHorizontal: 4 }}>{title}</Text>
      <View style={{ backgroundColor: c.panel, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' }}>{children}</View>
      {note ? <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18, paddingHorizontal: 4 }}>{note}</Text> : null}
    </View>
  );
  const button = (label: string, onPress: () => void, last?: boolean) => (
    <Pressable onPress={onPress} disabled={!!busy}
      style={({ pressed }) => ({ padding: 16, flexDirection: 'row', justifyContent: 'space-between',
        opacity: pressed || busy ? 0.5 : 1, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: c.line })}>
      <Text style={{ fontSize: 16, color: c.accent }}>{label}</Text>
      {busy === label ? <ActivityIndicator /> : null}
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: '설정' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 28 }}>
        {section('글자 크기', (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {SIZES.map(n => {
                const on = data.settings.fontSize === n;
                return (
                  <Pressable key={n} onPress={() => updateSettings({ fontSize: n })} accessibilityLabel={`${n}포인트`}
                    style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? c.accent : 'transparent' }}>
                    <Text style={{ fontSize: 15, color: on ? '#fff' : c.ink, fontVariant: ['tabular-nums'] }}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: fonts.serif, fontSize: data.settings.fontSize, lineHeight: data.settings.fontSize * 1.9, color: c.ink }}>
              오늘의 문장은 이렇게 보여요.
            </Text>
          </View>
        ))}

        {section('Mac과 주고받기', (
          <>
            {button('백업 내보내기', () => run('백업 내보내기', exportBackup))}
            {button('백업 불러오기', restore, true)}
          </>
        ), '백업 파일에는 글과 사진이 모두 들어 있어요. 내보내기를 누르고 AirDrop으로 Mac에 보내거나 "파일에 저장"을 고르세요. Mac 글방에서는 파일 › 백업에서 복원…으로 불러오면 돼요. 반대로 Mac에서 만든 백업 파일은 여기서 불러올 수 있어요.')}

        {section('정보', (
          <View style={{ padding: 16, gap: 4 }}>
            <Text style={{ fontFamily: fonts.serifBold, fontSize: 16, color: c.ink }}>글방</Text>
            <Text style={{ fontSize: 13, color: c.muted }}>
              이야기 {data.stories.filter(s => !s.trashedAt).length}개 · 글 {data.posts.filter(p => !p.trashedAt).length}개
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
