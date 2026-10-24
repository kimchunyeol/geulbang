// 사진은 앱 문서 폴더의 photos/ 안에 고유 이름으로 복사해 둔다
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { photoId } from '@/utils/id';

export const photosDir = new Directory(Paths.document, 'photos');
if (!photosDir.exists) photosDir.create({ intermediates: true });

export const photoFile = (name: string) => new File(photosDir, name);
export const photoUri = (name: string) => photoFile(name).uri;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
};

// 사진첩에서 여러 장 골라 앱 폴더로 복사한 뒤 파일명 목록을 돌려준다
export async function pickPhotos(): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 20,
    quality: 0.85, // JPEG로 다시 저장되어 Mac에서도 열림 (HEIC 방지)
  });
  if (result.canceled) return [];
  const names: string[] = [];
  for (const asset of result.assets) {
    const ext = EXT_BY_MIME[asset.mimeType ?? ''] ?? 'jpg';
    const name = `${photoId()}.${ext}`;
    new File(asset.uri).copy(photoFile(name));
    names.push(name);
  }
  return names;
}

// 어떤 글에도 쓰이지 않는 사진 파일 정리
export function cleanupPhotos(used: Set<string>) {
  for (const item of photosDir.list()) {
    if (item instanceof File && !used.has(item.name)) {
      try { item.delete(); } catch {}
    }
  }
}
