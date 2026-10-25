// 빌드 후 실행: quarantine 등 확장 속성을 지우고 ad-hoc 서명을 다시 해서
// 맥에서 '확인할 수 없음' 경고 없이 열리도록 한다. (npm run dist 뒤에 postdist로 자동 실행)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'darwin') process.exit(0);

const distDir = path.join(__dirname, '..', 'dist');
const apps = fs.existsSync(distDir)
  ? fs.readdirSync(distDir)
      .filter((d) => d.startsWith('mac'))
      .flatMap((d) => fs.readdirSync(path.join(distDir, d))
        .filter((f) => f.endsWith('.app'))
        .map((f) => path.join(distDir, d, f)))
  : [];

if (apps.length === 0) {
  console.error('dist/mac*/ 안에서 .app을 찾지 못했습니다.');
  process.exit(1);
}

for (const app of apps) {
  console.log(`서명 정리: ${app}`);
  execFileSync('xattr', ['-cr', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
}
console.log('완료: ad-hoc 서명 + quarantine 제거');
