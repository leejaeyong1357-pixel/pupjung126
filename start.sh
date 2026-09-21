#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  [오류] Node.js 가 설치되어 있지 않습니다."
  echo "         https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
  echo ""
  exit 1
fi
exec node server.js
