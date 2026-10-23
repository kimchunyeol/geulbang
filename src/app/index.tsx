import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES } from '@/constants/categories';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePosts } from '@/store/posts';
import { exportBackup, pickBackup } from '@/utils/backup';
import { formatLongDate } from '@/utils/format-date';
import { showMessage } from '@/utils/show-message';

// 첫 화면: 일기·메모·수필 중 하나를 고르는 곳
export default function HomeScreen() {
  const colors = useTheme();
  const { posts, restorePosts } = usePosts();
  const [today] = useState(() => Date.now()); // 화면을 처음 열 때의 날짜

  async function handleBackup() {
    if (posts.length === 0) {
      showMessage('아직 백업할 글이 없어요.');
      return;
    }
    try {
      await exportBackup(posts);
    } catch (error) {
      console.warn('백업하지 못했어요', error);
      showMessage('백업하지 못했어요', '잠시 뒤에 다시 해 주세요.');
    }
  }

  async function handleRestore() {
    try {
      const backupPosts = await pickBackup();
      if (!backupPosts) return; // 파일 고르기를 취소했어요
      const { added, updated } = restorePosts(backupPosts);
      if (added === 0 && updated === 0) {
        showMessage('이미 모든 글이 들어 있어요.');
      } else {
        showMessage('복원했어요', `새 글 ${added}편, 고쳐진 글 ${updated}편을 가져왔어요.`);
      }
    } catch (error) {
      showMessage('복원하지 못했어요', error instanceof Error ? error.message : undefined);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>글방</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatLongDate(today)}
          </Text>
        </View>

        <View style={styles.cards}>
          {CATEGORIES.map((category) => {
            const count = posts.filter((post) => post.category === category.id).length;
            return (
              <Link
                key={category.id}
                href={{ pathname: '/category/[id]', params: { id: category.id } }}
                asChild>
                {/* Link asChild는 함수형 style을 넘기지 못하므로, 눌림 상태는 children에서 처리 */}
                <Pressable>
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.colorBar, { backgroundColor: category.color }]} />
                      <View style={styles.cardText}>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {category.name}
                        </Text>
                        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                          {category.description}
                        </Text>
                        <Text style={[styles.count, { color: colors.textSecondary }]}>
                          {count}편
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>

        {/* 글을 파일로 내보내거나, 내보낸 파일에서 다시 가져와요 */}
        <View style={styles.backup}>
          <Pressable onPress={handleBackup} hitSlop={8}>
            {({ pressed }) => (
              <Text style={[styles.backupButton, { color: colors.accent }, pressed && styles.pressed]}>
                백업하기
              </Text>
            )}
          </Pressable>
          <Text style={{ color: colors.border }}>|</Text>
          <Pressable onPress={handleRestore} hitSlop={8}>
            {({ pressed }) => (
              <Text style={[styles.backupButton, { color: colors.accent }, pressed && styles.pressed]}>
                복원하기
              </Text>
            )}
          </Pressable>
        </View>
        <Text style={[styles.backupHint, { color: colors.textSecondary }]}>
          복원하면 지금 글은 그대로 두고, 백업에 있던 글을 더해요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    letterSpacing: 2,
  },
  date: {
    fontSize: 14,
  },
  cards: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.6,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardText: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  cardName: {
    fontFamily: Fonts.serif,
    fontSize: 20,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  count: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  backup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  backupButton: {
    fontSize: 15,
  },
  backupHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
