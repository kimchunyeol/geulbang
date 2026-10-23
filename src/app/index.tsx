import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES } from '@/constants/categories';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePosts } from '@/store/posts';
import { formatLongDate } from '@/utils/format-date';

// 첫 화면: 일기·메모·수필 중 하나를 고르는 곳
export default function HomeScreen() {
  const colors = useTheme();
  const { posts } = usePosts();
  const [today] = useState(() => Date.now()); // 화면을 처음 열 때의 날짜

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
});
