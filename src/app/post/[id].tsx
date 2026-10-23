import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckBox } from '@/components/check-box';
import { findCategory } from '@/constants/categories';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isPostEmpty, makeId, usePosts, type Block } from '@/store/posts';
import { formatLongDate } from '@/utils/format-date';

// 두 번 톡톡으로 볼 간격 (밀리초). 크게 하면 천천히 두 번 눌러도 알아채요.
const DOUBLE_TAP_DELAY = 300;

// 지금 시각 (밀리초). 터치할 때만 불러요.
function currentTime() {
  return Date.now();
}

// 글쓰기 화면. 쓰는 즉시 저장되므로 따로 '저장' 버튼이 없어요.
export default function PostScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const { posts, isLoaded, updatePost, deletePost, discardIfEmpty } = usePosts();
  const colors = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const post = posts.find((item) => item.id === id);
  const category = findCategory(post?.category);

  // 각 블록의 입력칸을 기억해 두었다가, 새 블록을 만들면 그 칸으로 커서를 옮겨요.
  const inputRefs = useRef(new Map<string, TextInputInstance>());
  const pendingFocus = useRef<{ id: string; cursorAt?: number } | null>(null);
  const lastFocusedId = useRef<string | null>(null);
  const lastTapAt = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  // 이미 쓴 글은 읽기 모드로 열고, '쓰기' 버튼으로 만든 새 글은 바로 쓰기 모드로 열어요.
  const [isReading, setIsReading] = useState(isNew !== 'true');

  // 화면을 나갈 때 아무것도 안 쓴 글이면 지워요.
  useEffect(() => () => discardIfEmpty(id), [id, discardIfEmpty]);

  // 화면이 다시 그려진 뒤, 커서를 옮기기로 한 블록이 있으면 옮겨요.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const { id: blockId, cursorAt } = pendingFocus.current;
    const input = inputRefs.current.get(blockId);
    input?.focus();
    if (cursorAt !== undefined) input?.setSelection(cursorAt, cursorAt);
    pendingFocus.current = null;
  });

  if (!isLoaded) return null;
  if (!post || !category) {
    return <Text style={[styles.missing, { color: colors.textSecondary }]}>글을 찾을 수 없어요</Text>;
  }

  const blocks = post.blocks;

  function setBlocks(next: Block[]) {
    updatePost(post!.id, { blocks: next });
  }

  function changeBlock(blockId: string, changes: Partial<Block>) {
    setBlocks(blocks.map((block) => (block.id === blockId ? ({ ...block, ...changes } as Block) : block)));
  }

  function focusLater(blockId: string, cursorAt?: number) {
    pendingFocus.current = { id: blockId, cursorAt };
  }

  // 읽기 모드에서 두 번 톡톡 누르면 쓰기 모드로 바꾸고, 마지막 줄 끝에 커서를 놓아요.
  function handleReadingTap() {
    const now = currentTime();
    if (now - lastTapAt.current < DOUBLE_TAP_DELAY) {
      lastTapAt.current = 0;
      const lastBlock = blocks[blocks.length - 1];
      setIsReading(false);
      focusLater(lastBlock.id, lastBlock.text.length);
    } else {
      lastTapAt.current = now;
    }
  }

  // '완료'를 누르면 키보드를 내리고 다시 읽기 모드로 돌아가요.
  function finishEditing() {
    Keyboard.dismiss();
    if (!isPostEmpty(post!)) setIsReading(true);
  }

  // 툴바의 '체크 목록' 버튼: 지금 커서가 있는 곳 아래에 체크 블록을 넣어요.
  // 커서가 있는 칸이 비어 있는 글 블록이면, 그 칸을 체크 블록으로 바꿔요.
  function addCheckBlock() {
    const focusedIndex = blocks.findIndex((block) => block.id === lastFocusedId.current);
    const index = focusedIndex === -1 ? blocks.length - 1 : focusedIndex;
    const target = blocks[index];
    const newBlock: Block = { id: makeId(), type: 'check', text: '', checked: false };

    const next = [...blocks];
    if (target.type === 'text' && target.text.trim() === '') {
      next.splice(index, 1, newBlock);
    } else {
      next.splice(index + 1, 0, newBlock);
    }
    setBlocks(next);
    focusLater(newBlock.id);
  }

  // 체크 블록에서 줄바꿈(엔터)을 누르면 아래에 새 체크 블록이 생겨요.
  // 빈 체크 블록에서 누르면 체크를 끝내고 보통 글 블록으로 바꿔요.
  function handleCheckSubmit(index: number) {
    const block = blocks[index];
    const next = [...blocks];
    if (block.text.trim() === '') {
      const textBlock: Block = { id: makeId(), type: 'text', text: '' };
      next.splice(index, 1, textBlock);
      setBlocks(next);
      focusLater(textBlock.id);
    } else {
      const newBlock: Block = { id: makeId(), type: 'check', text: '', checked: false };
      next.splice(index + 1, 0, newBlock);
      setBlocks(next);
      focusLater(newBlock.id);
    }
  }

  // 빈 체크 블록에서 지우기(←)를 누르면 그 블록을 없애고 윗줄로 올라가요.
  function handleCheckBackspace(index: number) {
    if (blocks[index].text !== '') return;
    if (blocks.length === 1) {
      const textBlock: Block = { id: makeId(), type: 'text', text: '' };
      setBlocks([textBlock]);
      focusLater(textBlock.id);
      return;
    }
    const neighbor = blocks[index - 1] ?? blocks[index + 1];
    setBlocks(blocks.filter((_, i) => i !== index));
    focusLater(neighbor.id);
  }

  function handleDelete() {
    Alert.alert('이 글을 지울까요?', '지운 글은 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          router.back();
          deletePost(post!.id);
        },
      },
    ]);
  }

  function rememberInput(blockId: string) {
    return (input: TextInputInstance | null) => {
      if (input) inputRefs.current.set(blockId, input);
      else inputRefs.current.delete(blockId);
    };
  }

  function handleFocus(blockId: string) {
    lastFocusedId.current = blockId;
    setIsEditing(true);
  }

  const showToolbar = !isReading && (category.allowsChecklist || isEditing);

  return (
    <>
      <Stack.Screen
        options={{
          title: category.name,
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={12}>
              <Text style={[styles.headerButton, { color: colors.textSecondary }]}>삭제</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          {/* 읽기 모드일 때만 두 번 톡톡을 알아채요. 쓰기 모드에서는 꺼 둬요. */}
          <Pressable onPress={handleReadingTap} disabled={!isReading} accessible={false}>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatLongDate(post.createdAt)}
            </Text>

            {isReading ? (
              post.title.trim() !== '' && (
                <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
              )
            ) : (
              <TextInput
                value={post.title}
                onChangeText={(title) => updatePost(post.id, { title })}
                placeholder="제목"
                placeholderTextColor={colors.border}
                style={[styles.title, { color: colors.text }]}
                multiline
                submitBehavior="submit"
                returnKeyType="next"
                onSubmitEditing={() => inputRefs.current.get(blocks[0].id)?.focus()}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
              />
            )}

            {blocks.map((block, index) =>
              block.type === 'check' ? (
                <View key={block.id} style={styles.checkRow}>
                  <View style={styles.checkBoxWrap}>
                    <CheckBox
                      checked={block.checked}
                      onToggle={() => changeBlock(block.id, { checked: !block.checked })}
                    />
                  </View>
                  {isReading ? (
                    <Text
                      style={[
                        styles.body,
                        styles.checkText,
                        { color: block.checked ? colors.textSecondary : colors.text },
                        block.checked && styles.checkedText,
                      ]}>
                      {block.text}
                    </Text>
                  ) : (
                    <TextInput
                      ref={rememberInput(block.id)}
                      value={block.text}
                      onChangeText={(text) => changeBlock(block.id, { text })}
                      placeholder="할 일"
                      placeholderTextColor={colors.border}
                      style={[
                        styles.body,
                        styles.checkText,
                        { color: block.checked ? colors.textSecondary : colors.text },
                        block.checked && styles.checkedText,
                      ]}
                      multiline
                      submitBehavior="submit"
                      onSubmitEditing={() => handleCheckSubmit(index)}
                      onKeyPress={(event) => {
                        if (event.nativeEvent.key === 'Backspace') handleCheckBackspace(index);
                      }}
                      onFocus={() => handleFocus(block.id)}
                      onBlur={() => setIsEditing(false)}
                    />
                  )}
                </View>
              ) : isReading ? (
                block.text !== '' && (
                  <Text key={block.id} style={[styles.body, { color: colors.text }]}>
                    {block.text}
                  </Text>
                )
              ) : (
                <TextInput
                  key={block.id}
                  ref={rememberInput(block.id)}
                  value={block.text}
                  onChangeText={(text) => changeBlock(block.id, { text })}
                  placeholder={index === 0 ? '여기에 글을 써 보세요' : ''}
                  placeholderTextColor={colors.border}
                  style={[styles.body, { color: colors.text }]}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  onFocus={() => handleFocus(block.id)}
                  onBlur={() => setIsEditing(false)}
                />
              )
            )}

            {/* 글 아래 빈 곳: 쓰기 모드에서는 누르면 마지막 줄로, 읽기 모드에서는 두 번 톡톡 */}
            <Pressable
              style={styles.tapArea}
              onPress={
                isReading
                  ? handleReadingTap
                  : () => inputRefs.current.get(blocks[blocks.length - 1].id)?.focus()
              }
            />
          </Pressable>
        </ScrollView>

        {isReading && (
          <Text
            style={[
              styles.readingHint,
              { color: colors.textSecondary, paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            두 번 톡톡 누르면 이어서 쓸 수 있어요
          </Text>
        )}

        {showToolbar && (
          <View
            style={[
              styles.toolbar,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
                paddingBottom: isEditing ? Spacing.two : Math.max(insets.bottom, Spacing.two),
              },
            ]}>
            {category.allowsChecklist ? (
              <Pressable onPress={addCheckBlock} hitSlop={8} style={styles.toolbarButton}>
                <Text style={[styles.toolbarText, { color: colors.accent }]}>☑ 체크 목록</Text>
              </Pressable>
            ) : (
              <View />
            )}
            {isEditing && (
              <Pressable onPress={finishEditing} hitSlop={8} style={styles.toolbarButton}>
                <Text style={[styles.toolbarText, { color: colors.textSecondary }]}>완료</Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  headerButton: {
    fontSize: 16,
    paddingHorizontal: Spacing.one,
  },
  date: {
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 34,
    paddingVertical: Spacing.two,
    paddingHorizontal: 0,
    marginBottom: Spacing.three,
  },
  body: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    lineHeight: 28,
    paddingVertical: Spacing.one,
    paddingHorizontal: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  checkBoxWrap: {
    // 체크 칸을 글자 첫 줄 높이에 맞춰요 (줄 높이 28 - 칸 높이 20) / 2 + 위 여백 4
    paddingTop: 8,
  },
  checkText: {
    flex: 1,
  },
  checkedText: {
    textDecorationLine: 'line-through',
  },
  tapArea: {
    minHeight: 240,
  },
  readingHint: {
    textAlign: 'center',
    fontSize: 12,
    paddingTop: Spacing.two,
    opacity: 0.7,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  toolbarButton: {
    paddingVertical: Spacing.two,
  },
  toolbarText: {
    fontSize: 15,
  },
  missing: {
    textAlign: 'center',
    marginTop: 64,
    fontSize: 15,
  },
});
