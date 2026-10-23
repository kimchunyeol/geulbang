import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// 웹으로 내보낼 때 모든 페이지를 감싸는 HTML이에요. (폰 앱에서는 쓰이지 않아요)
// 아이폰 홈 화면에 앱처럼 설치되도록 필요한 정보를 <head>에 넣어요.
// GitHub Pages 주소가 /geulbang/ 아래라서 파일 경로 앞에 /geulbang 을 붙여요.
const BASE = '/geulbang';

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="ko" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* maximum-scale=1: 입력칸을 누를 때 화면이 확대되지 않게 / viewport-fit=cover: 노치 영역까지 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#FAF8F4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1A1917" media="(prefers-color-scheme: dark)" />

        {/* 홈 화면에 추가했을 때 주소창 없이 앱처럼 열리게 */}
        <link rel="manifest" href={`${BASE}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="글방" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* 아이폰에는 한글 명조 글꼴이 없어서, 웹에서는 나눔명조를 불러와요 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap"
        />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: pageStyle }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// touch-action: 두 번 톡톡 했을 때 사파리가 화면을 확대하지 않게 해요.
const pageStyle = `
html, body { background-color: #FAF8F4; touch-action: manipulation; }
@media (prefers-color-scheme: dark) { html, body { background-color: #1A1917; } }
`;
