// 백업 파일: Mac 글방과 같은 JSON 형식. 사진은 photoData에 base64로 함께 담는다
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { cleanupPhotos, photoFile } from './photos';
import { replaceAll, store } from './store';
import { DEFAULT_SETTINGS, type Data } from './types';
import { localDate } from '@/utils/format';

type Backup = Data & { format?: string; version?: number; exportedAt?: number; photoData?: Record<string, string> };

const PHOTO_NAME = /^[a-z0-9-]+\.(jpg|jpeg|png|gif|webp|heic)$/;

export async function exportBackup() {
  const data = store.get();
  const photoData: Record<string, string> = {};
  for (const name of new Set(data.posts.flatMap(p => p.photos))) {
    const f = photoFile(name);
    if (f.exists) photoData[name] = await f.base64();
  }
  const backup: Backup = { format: 'geulbang-backup', version: 2, exportedAt: Date.now(), ...data, photoData };
  const file = new File(Paths.cache, `geulbang-backup-${localDate()}.json`);
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: '글방 백업' });
}

// 파일을 골라 읽고 검사만 한다. 실제 덮어쓰기는 확인 후 applyBackup으로
export async function pickBackup(): Promise<Backup | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const parsed = JSON.parse(await new File(res.assets[0].uri).text());
  if (!Array.isArray(parsed.stories) || !Array.isArray(parsed.posts)) throw new Error('글방 백업 파일이 아니에요.');
  return parsed;
}

export function summarize(b: Backup) {
  return {
    stories: b.stories.filter(s => !s.trashedAt).length,
    posts: b.posts.filter(p => !p.trashedAt).length,
    photos: Object.keys(b.photoData ?? {}).length,
  };
}

export function applyBackup(b: Backup) {
  for (const [name, base64] of Object.entries(b.photoData ?? {})) {
    if (!PHOTO_NAME.test(name)) continue;
    const f = photoFile(name);
    if (!f.exists) f.write(base64, { encoding: 'base64' });
  }
  const data: Data = {
    folders: b.folders ?? [],
    stories: b.stories.map(s => ({ ...s, folderId: s.folderId ?? null, trashedAt: s.trashedAt ?? null, dateVisible: !!s.dateVisible })),
    posts: b.posts.map(p => ({ ...p, trashedAt: p.trashedAt ?? null, align: p.align ?? 'left', photos: Array.isArray(p.photos) ? p.photos : [] })),
    settings: { ...DEFAULT_SETTINGS, ...store.get().settings, ...b.settings },
  };
  replaceAll(data);
  cleanupPhotos(new Set(data.posts.flatMap(p => p.photos)));
}
