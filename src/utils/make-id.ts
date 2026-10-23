// 글과 블록마다 붙이는 겹치지 않는 이름표를 만들어요.
export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
