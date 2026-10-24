# 글방

이야기별로 글을 모아 두는 우리 가족 글쓰기 앱이에요.
이야기(공책)를 만들고, 그 안에 날짜별로 글과 사진을 남겨요.

- **아이폰·아이패드·안드로이드**: https://kimchunyeol.github.io/geulbang/ (웹앱)
- **Mac**: [Releases](https://github.com/kimchunyeol/geulbang/releases/latest)에서 `Geulbang-mac.zip`

## Mac에서 쓰기

1. 이 저장소의 **Releases**에서 최신 `Geulbang-mac.zip`을 내려받아 압축을 풀어요.
2. `Geulbang.app`(이름은 "글방"으로 보여요)을 **응용 프로그램** 폴더로 옮겨요.
3. 처음 열 때 "확인되지 않은 개발자" 경고가 뜨면:
   - **시스템 설정 › 개인정보 보호 및 보안**으로 가서 아래쪽의 **그래도 열기**를 누르세요.
   - Apple 정식 서명(유료 개발자 인증서)을 하지 않은 앱이라 생기는 경고예요.

Apple Silicon(M1 이상) Mac용이에요.

## 아이폰에서 쓰기

1. 아이폰 **Safari**로 https://kimchunyeol.github.io/geulbang/ 을 열어요.
2. 아래쪽 **공유 버튼**(네모에 화살표) › **홈 화면에 추가**를 눌러요.
3. 홈 화면의 **글방** 아이콘으로 열면 앱처럼 전체 화면으로 열리고, 인터넷이 없어도 써져요.

- 글과 사진은 **그 아이폰 안에만** 저장돼요. 서버로 올라가지 않아요.
- 아이폰을 바꾸거나 저장 공간을 정리하면 사라질 수 있으니 ☰ › **백업 내보내기**로 가끔 백업 파일을 받아 두세요.
- Safari에서 연 글방과 홈 화면 아이콘으로 연 글방은 저장 공간이 따로예요. 한쪽에서만 쓰세요.

## Mac ↔ 아이폰 글 옮기기

백업 파일 하나에 글과 사진이 모두 들어가요.

- **아이폰 → Mac**: 아이폰 글방 › ☰ › **백업 내보내기** → AirDrop으로 Mac에 보내기 → Mac 글방 › 파일 › **백업에서 복원…**
- **Mac → 아이폰**: Mac 글방 › 파일 › **전체 백업…** → 파일을 아이폰으로 보내기(AirDrop 등) → 아이폰 글방 › ☰ › **백업 불러오기**

복원하면 그 기기의 글이 백업 내용으로 **통째로 바뀌어요** (합쳐지지 않아요).

Mac끼리는 설정에서 **iCloud 동기화**를 켜면 같은 Apple 계정의 Mac들 사이에서 자동으로 맞춰져요.

## 기능

- 이야기 · 폴더 · 날짜별 글, 정렬(날짜/제목), 글 날짜 보이기/숨기기
- 사진 첨부 (첫 사진이 커버), 사진 크게 보기
- 전체 검색, 휴지통 30일 보관
- 단어수 / 글자수(공백 포함·제외) 전환, 글자 크기 설정
- Mac: Markdown 내보내기, PDF 저장, iCloud Drive 동기화, 다크 모드

## 개발

- `mac/` — Mac 앱 (Electron). 화면은 `mac/src/index.html` 하나이고 웹앱도 같은 파일을 써요.
- `docs/` — 웹앱 (GitHub Pages). `index.html`, `web-bridge.js`는 아래 명령이 만드는 사본이라 직접 고치지 않아요.
- `iphone/` — Expo로 만든 아이폰 앱 (App Store/TestFlight용, 지금은 개발용으로만 씀)

화면을 고친 뒤 웹앱에 반영하려면:

```sh
cd mac
npm run web        # mac/src → docs/ 복사, 오프라인 보관본 버전 갱신
git add -A && git commit && git push   # 1~2분 뒤 웹앱 주소에 반영
```

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
