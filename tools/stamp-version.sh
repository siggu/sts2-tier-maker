#!/usr/bin/env bash
# 배포 직전에 JS·CSS 주소에 ?v=<버전> 을 붙여 브라우저가 예전 파일을 캐시에서 쓰지 않게 한다.
# 사용: tools/stamp-version.sh <사이트 폴더> <버전>
set -euo pipefail
dir="$1"; v="$2"
sed -i -E "s#(from '\./[A-Za-z0-9_-]+\.js)'#\1?v=${v}'#g" "$dir"/js/*.js
sed -i -E "s#(src=\"js/app\.js)\"#\1?v=${v}\"#; s#(href=\"css/style\.css)\"#\1?v=${v}\"#" "$dir"/index.html
# 붙지 않은 상대 import 가 남아 있으면 실패
if grep -nE "from '\./[A-Za-z0-9_-]+\.js'" "$dir"/js/*.js; then
  echo "버전을 붙이지 못한 import 가 있습니다" >&2; exit 1
fi
grep -q "js/app.js?v=${v}" "$dir"/index.html
grep -q "css/style.css?v=${v}" "$dir"/index.html
