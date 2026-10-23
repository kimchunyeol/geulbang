import type { Post } from '@/store/posts';

// 목록에 보여줄 제목. 제목을 비워 두면 본문 첫 줄을 대신 써요.
export function getPostTitle(post: Post) {
  if (post.title.trim()) return post.title.trim();
  const firstLine = post.blocks
    .map((block) => block.text.trim())
    .find((text) => text !== '')
    ?.split('\n')[0];
  return firstLine ?? '제목 없음';
}

// 목록에 보여줄 본문 미리보기 (앞부분 몇 줄)
export function getPostPreview(post: Post) {
  return post.blocks
    .map((block) => (block.type === 'check' ? `${block.checked ? '☑' : '☐'} ${block.text}` : block.text))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 체크 블록이 있으면 "2/5"처럼 완료 개수를 알려줘요.
export function getChecklistProgress(post: Post) {
  const checks = post.blocks.filter((block) => block.type === 'check');
  if (checks.length === 0) return null;
  const done = checks.filter((block) => block.checked).length;
  return `${done}/${checks.length}`;
}
