// Mac 앱과 같은 화면 파일을 웹앱(GitHub Pages, docs/)으로 복사한다.
// docs/의 index.html, web-bridge.js는 이 스크립트가 만드는 사본이니 직접 고치지 말 것.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
const docs = path.join(__dirname, '..', '..', 'docs');

for (const name of ['index.html', 'web-bridge.js']) {
  fs.copyFileSync(path.join(src, name), path.join(docs, name));
}
// 앱 파일이 바뀔 때마다 서비스 워커 보관본도 새로 받도록 버전을 올린다
const sw = path.join(docs, 'sw.js');
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const CACHE = 'geulbang-[^']*';/, `const CACHE = 'geulbang-${stamp}';`));
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('docs/ 갱신 완료:', stamp);
