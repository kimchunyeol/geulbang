import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';

import { photoUri } from '@/data/photos';

// 사진 크게 보기 — 아무 곳이나 누르면 닫힘
export default function PhotoScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return (
    <Pressable onPress={() => router.back()} accessibilityLabel="닫기" style={{ flex: 1, backgroundColor: '#000' }}>
      <Image source={{ uri: photoUri(name) }} contentFit="contain" style={{ flex: 1 }} />
    </Pressable>
  );
}
