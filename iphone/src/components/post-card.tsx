import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { photoUri } from '@/data/photos';
import { trashPost } from '@/data/store';
import type { Post } from '@/data/types';
import { fonts, useColors } from '@/theme/colors';
import { formatDate } from '@/utils/format';

type Props = {
  post: Post;
  showDate: boolean;
  caption?: string; // 검색 결과처럼 이야기 이름을 함께 보여줄 때
  preview?: string;
};

export function PostCard({ post, showDate, caption, preview }: Props) {
  const c = useColors();
  const cover = post.photos[0];
  const meta = [caption, showDate ? formatDate(post.writedAt) : null].filter(Boolean).join(' · ');

  return (
    <Link href={{ pathname: '/post/[id]', params: { id: post.id } }} asChild>
      <Link.Trigger>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: c.line, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 6 }}>
              {meta ? <Text style={{ fontSize: 12, color: c.muted, letterSpacing: 0.4 }}>{meta}</Text> : null}
              <Text numberOfLines={1} style={{ fontFamily: fonts.serifBold, fontSize: 17, color: c.ink }}>
                {post.title || '제목 없음'}
              </Text>
              {(preview ?? post.text) ? (
                <Text numberOfLines={2} style={{ fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, color: c.muted }}>
                  {preview ?? post.text}
                </Text>
              ) : null}
            </View>
            {cover ? (
              <Image source={{ uri: photoUri(cover) }} contentFit="cover" transition={150}
                style={{ width: 72, height: 72, borderRadius: 8, borderCurve: 'continuous', backgroundColor: c.panel }} />
            ) : null}
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction title="휴지통으로" icon="trash" destructive onPress={() => trashPost(post.id)} />
      </Link.Menu>
    </Link>
  );
}
