#!/bin/sh
# 웹으로 내보낸 dist 폴더만 GitHub의 gh-pages 가지에 올려요. (GitHub Pages가 이 가지를 보여줘요)
# 사용법: npm run deploy   (predeploy가 먼저 dist를 새로 만들어요)
set -e

ROOT=$(pwd)
REMOTE=$(git remote get-url origin)
NAME=$(git config user.name)
EMAIL=$(git config user.email)

cd "$ROOT/dist"
# Expo가 만든 _expo 폴더를 GitHub Pages가 숨기지 않게 해요.
touch .nojekyll

# dist 안에 잠깐 새 git 저장소를 만들어, 내보낸 파일만 담은 커밋 하나를 올리고 지워요.
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Deploy web build"
git push -q -f "$REMOTE" gh-pages
rm -rf .git

echo "배포했어요: https://kimchunyeol.github.io/geulbang/"
