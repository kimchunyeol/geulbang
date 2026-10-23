import { useState } from 'react';
import { Platform, TextInput, type TextInputInstance, type TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'multiline'> & {
  ref?: (input: TextInputInstance | null) => void;
  // true면 엔터를 눌렀을 때 줄을 바꾸지 않고 onSubmitEditing을 불러요. (제목, 체크 줄)
  submitOnEnter?: boolean;
};

// 글쓰기 화면의 여러 줄 입력칸. 글이 길어지면 칸도 함께 늘어나요.
// 폰과 웹은 입력칸이 조금씩 달라서, 그 차이를 이 부품 안에서 맞춰 줘요.
export function EditorInput({ submitOnEnter = false, style, onContentSizeChange, ...props }: Props) {
  const [webHeight, setWebHeight] = useState<number>();

  if (Platform.OS === 'web') {
    return (
      <TextInput
        {...props}
        // 웹은 엔터 동작을 blurOnSubmit으로 정해요. (폰의 submitBehavior와 같은 역할)
        {...({ blurOnSubmit: submitOnEnter } as object)}
        multiline
        rows={1}
        // 웹의 입력칸은 저절로 늘어나지 않아서, 글 높이를 재서 직접 맞춰요.
        onContentSizeChange={(event) => {
          setWebHeight(event.nativeEvent.contentSize.height);
          onContentSizeChange?.(event);
        }}
        style={[style, { height: webHeight, resize: 'none', outlineStyle: 'none' } as object]}
      />
    );
  }

  return (
    <TextInput
      {...props}
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      submitBehavior={submitOnEnter ? 'submit' : undefined}
      onContentSizeChange={onContentSizeChange}
      style={style}
    />
  );
}

// 입력칸의 커서를 position 위치로 옮겨요. (폰은 setSelection, 웹은 setSelectionRange)
export function placeCursor(input: TextInputInstance, position: number) {
  if (Platform.OS === 'web') {
    (input as unknown as HTMLTextAreaElement).setSelectionRange?.(position, position);
  } else {
    input.setSelection(position, position);
  }
}
