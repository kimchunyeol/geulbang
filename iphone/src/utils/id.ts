// Mac 글방과 같은 ID 모양
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 사진 파일명: 소문자 16진수와 하이픈만 (Mac 쪽 photo:// 검사 규칙과 맞춤)
export function photoId() {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}
