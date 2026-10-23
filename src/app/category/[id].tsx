import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, findCategory } from '@/constants/categories';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePosts, type Post } from '@/store/posts';
import { confirmDelete } from '@/utils/confirm-delete';
import { formatShortDate } from '@/utils/format-date';
import {
  getChecklistProgress,
  getPostPreview,
  getPostTitle,
  postMatches,
} from '@/utils/post-preview';

// 웹으로 내보낼 때 카테고리 세 개의 목록 페이지를 미리 만들어 둬요.
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ id: category.id }));
}

// 글 목록 화면. 주소의 [id] 자리에 diary / memo / essay 가 들어와요.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = findCategory(id);
  const colors = useTheme();
  const { posts, isLoaded, createPost, deletePost } = usePosts();
  const [query, setQuery] = useState(''); // 검색창에 입력한 글자

  if (!category) {
    return <Text style={[styles.empty, { color: colors.textSecondary }]}>없는 카테고리예요</Text>;
  }

  const categoryPosts = posts
    .filter((post) => post.category === category.id && postMatches(post, query))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const isSearching = query.trim() !== '';

  function handleWrite() {
    const postId = createPost(category!.id);
    router.push({ pathname: '/post/[id]', params: { id: postId, isNew: 'true' } });
  }

  function handleLongPress(post: Post) {
    confirmDelete(() => deletePost(post.id));
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: category.name,
          headerRight: () => (
            <Pressable onPress={handleWrite} hitSlop={12}>
              <Text style={[styles.writeButton, { color: colors.accent }]}>쓰기</Text>
            </Pressable>
          ),
          // 헤더의 검색창. 글자를 칠 때마다 query가 바뀌고, 목록이 바로 걸러져요.
          headerSearchBarOptions: {
            placeholder: `${category.name}에서 찾기`,
            hideWhenScrolling: false,
            autoCapitalize: 'none',
            tintColor: colors.accent,
            textColor: colors.text,
            hintTextColor: colors.textSecondary,
            headerIconColor: colors.text,
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
          },
        }}
      />
      <FlatList
        data={categoryPosts}
        keyExtractor={(post) => post.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          !isLoaded ? undefined : isSearching ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              ‘{query.trim()}’이(가) 들어간 글이 없어요.
            </Text>
          ) : (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              아직 쓴 글이 없어요.{'\n'}오른쪽 위 ‘쓰기’를 눌러 시작해 보세요.
            </Text>
          )
        }
        renderItem={({ item: post }) => {
          const preview = getPostPreview(post);
          const progress = getChecklistProgress(post);
          return (
            <Link href={{ pathname: '/post/[id]', params: { id: post.id } }} asChild>
              <Pressable
                onLongPress={() => handleLongPress(post)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.rowTop}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                    {getPostTitle(post)}
                  </Text>
                  <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
                    {formatShortDate(post.createdAt)}
                  </Text>
                </View>
                {preview !== '' && (
                  <Text style={[styles.rowPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                    {preview}
                  </Text>
                )}
                {progress && (
                  <Text style={[styles.rowProgress, { color: colors.accent }]}>완료 {progress}</Text>
                )}
              </Pressable>
            </Link>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  writeButton: {
    fontSize: 16,
    paddingHorizontal: Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.5,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  rowTitle: {
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 18,
  },
  rowDate: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  rowPreview: {
    fontSize: 14,
    lineHeight: 21,
  },
  rowProgress: {
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    marginTop: Spacing.six,
  },
});
