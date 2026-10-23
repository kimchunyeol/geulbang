import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import type { Block, Post } from '@/store/posts';

// 백업 파일은 글 목록을 JSON 글자로 적어 둔 파일이에요.
// app·version을 함께 적어 두면, 나중에 모양이 바뀌어도 어떤 파일인지 알아볼 수 있어요.
const BACKUP_APP = 'geulbang';
const BACKUP_VERSION = 1;

type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  posts: Post[];
};

// 'geulbang-backup-2026-10-23.json' 같은 이름을 만들어요.
function makeFileName() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `geulbang-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// 글 목록을 파일로 내보내요.
// 폰에서는 공유 창이 떠서 '파일에 저장'·드라이브·메일 등 원하는 곳에 보관할 수 있고,
// 웹에서는 브라우저가 파일을 바로 내려받아요.
export async function exportBackup(posts: Post[]) {
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    posts,
  };
  const json = JSON.stringify(backup, null, 2);
  const fileName = makeFileName();

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete(); // 같은 날 두 번 백업하면 앞의 임시 파일을 지우고 새로 써요
  file.create();
  await file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: '글방 백업 저장하기',
  });
}

function isBlock(value: unknown): value is Block {
  const block = value as Block;
  if (typeof block?.id !== 'string' || typeof block.text !== 'string') return false;
  return block.type === 'text' || (block.type === 'check' && typeof block.checked === 'boolean');
}

function isPost(value: unknown): value is Post {
  const post = value as Post;
  return (
    typeof post?.id === 'string' &&
    CATEGORIES.some((category) => category.id === post.category) &&
    typeof post.title === 'string' &&
    Array.isArray(post.blocks) &&
    post.blocks.every(isBlock) &&
    typeof post.createdAt === 'number' &&
    typeof post.updatedAt === 'number'
  );
}

// 백업 파일을 골라서 그 안의 글 목록을 돌려줘요.
// 고르다가 취소하면 null, 글방 백업 파일이 아니면 오류를 던져요.
export async function pickBackup(): Promise<Post[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    base64: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();

  let backup: Partial<BackupFile>;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('글방 백업 파일이 아니에요.');
  }
  if (backup?.app !== BACKUP_APP || !Array.isArray(backup.posts)) {
    throw new Error('글방 백업 파일이 아니에요.');
  }
  if ((backup.version ?? 0) > BACKUP_VERSION) {
    throw new Error('더 새로운 글방에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 해 주세요.');
  }
  if (!backup.posts.every(isPost)) {
    throw new Error('백업 파일의 일부가 망가져 있어요.');
  }
  return backup.posts;
}
