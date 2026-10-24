# 글방

이야기별로 글을 모아 두는 우리 가족 글쓰기 앱이에요.
이야기(공책)를 만들고, 그 안에 날짜별로 글과 사진을 남겨요.

- `mac/` — Mac 앱 (Electron)
- `iphone/` — 아이폰 앱 (Expo)

## Mac에서 쓰기

1. 이 저장소의 **Releases**에서 최신 `Geulbang-mac.zip`을 내려받아 압축을 풀어요.
2. `Geulbang.app`(이름은 "글방"으로 보여요)을 **응용 프로그램** 폴더로 옮겨요.
3. 처음 열 때 "확인되지 않은 개발자" 경고가 뜨면:
   - **시스템 설정 › 개인정보 보호 및 보안**으로 가서 아래쪽의 **그래도 열기**를 누르세요.
   - Apple 정식 서명(유료 개발자 인증서)을 하지 않은 앱이라 생기는 경고예요.

Apple Silicon(M1 이상) Mac용이에요.

## 아이폰에서 쓰기

지금은 **Expo Go** 앱으로 열어요. 아직 App Store에 올리지 않았어요.

1. 아이폰에 App Store에서 **Expo Go**를 설치해요.
2. 개발용 Mac에서 아래를 실행하고, 화면의 QR 코드를 아이폰 카메라로 찍어요. (Mac과 아이폰이 같은 Wi-Fi에 있어야 해요)

   ```sh
   cd iphone
   npm install
   npx expo start
   ```

## Mac ↔ 아이폰 글 옮기기

백업 파일 하나에 글과 사진이 모두 들어가요.

- **아이폰 → Mac**: 아이폰 글방 › 설정 › **백업 내보내기** → AirDrop으로 Mac에 보내기 → Mac 글방 › 파일 › **백업에서 복원…**
- **Mac → 아이폰**: Mac 글방 › 파일 › **전체 백업…** → 파일을 아이폰으로 보내기 → 아이폰 글방 › 설정 › **백업 불러오기**

복원하면 그 기기의 글이 백업 내용으로 **통째로 바뀌어요** (합쳐지지 않아요).

Mac끼리는 설정에서 **iCloud 동기화**를 켜면 같은 Apple 계정의 Mac들 사이에서 자동으로 맞춰져요.

## 기능

- 이야기 · 폴더 · 날짜별 글, 정렬(날짜/제목), 글 날짜 보이기/숨기기
- 사진 첨부 (첫 사진이 커버), 사진 크게 보기
- 전체 검색, 휴지통 30일 보관
- 단어수 / 글자수(공백 포함·제외) 전환, 글자 크기 설정
- Mac: Markdown 내보내기, PDF 저장, iCloud Drive 동기화, 다크 모드

## 개발

### Mac 앱

```sh
cd mac
npm install
npm start          # 개발 모드로 실행
npm run dist       # mac/dist/mac-arm64/Geulbang.app 빌드
```

- 데이터: `~/Library/Application Support/Geulbang/geulbang.sqlite` (사진은 같은 폴더의 `photos/`)
- Electron 내장 `node:sqlite`를 써서 네이티브 모듈 빌드가 필요 없어요.
- 번들 내부 이름(`CFBundleName`, 실행 파일)은 영문 `Geulbang`이어야 해요. 한글을 넣으면 Electron이 Helper 프로세스를 찾지 못해 실행하자마자 종료돼요. 화면에 보이는 이름은 `CFBundleDisplayName`으로만 바꿔요.

### 아이폰 앱

```sh
cd iphone
npm install
npx expo start
npx tsc --noEmit && npx expo lint   # 검사
```

- Expo SDK 58, Expo Router. 패키지는 `npx expo install <이름>`으로 추가해요.
- 데이터는 `expo-sqlite`, 사진은 앱 문서 폴더의 `photos/`에 저장해요. 테이블 구조와 백업 형식은 Mac 앱과 같아요.

### 백업 파일 형식

```jsonc
{
  "format": "geulbang-backup",
  "version": 2,
  "folders": [], "stories": [], "posts": [], "settings": {},
  "photoData": { "<사진 파일명>": "<base64>" }
}
```
