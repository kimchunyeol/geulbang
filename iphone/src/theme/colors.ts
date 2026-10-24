// Mac 글방과 같은 종이 느낌 색. 시스템 밝기 설정을 따른다
import { useColorScheme } from 'react-native';

const light = {
  background: '#fbfaf7',
  panel: '#f3f1ec',
  ink: '#222222',
  muted: '#8a867e',
  line: '#e4e0d8',
  accent: '#b0503c',
  danger: '#c0392b',
};

const dark: typeof light = {
  background: '#1b1b1d',
  panel: '#232326',
  ink: '#e6e3dc',
  muted: '#8d8a84',
  line: '#333336',
  accent: '#e08a6f',
  danger: '#e0675a',
};

export type Palette = typeof light;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  serif: 'NotoSerifKR_400Regular',
  serifBold: 'NotoSerifKR_700Bold',
};
