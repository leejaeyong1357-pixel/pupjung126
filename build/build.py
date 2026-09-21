#!/usr/bin/env python3
"""조각 파일을 합쳐 public/index.html 을 만듭니다.

    python3 build/build.py

조직도와 권한 규칙은 public/org.js 에, 명단은 data/roster.json 에 있습니다.
둘 다 서버와 브라우저가 함께 쓰므로 이 빌드에 포함되지 않습니다.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "public", "index.html")
PARTS = ["p1.html", "p2.html", "p3.js", "p4.js", "p5.js", "p6.js", "p7.js", "p8.js"]


def main():
    logo = "data:image/png;base64," + open(os.path.join(HERE, "logo.b64")).read().strip()
    body = "".join(open(os.path.join(HERE, n), encoding="utf-8").read() for n in PARTS)
    body = body.replace("__LOGO__", logo)
    html = ("<!doctype html>\n<html lang=\"ko\">\n<head>\n"
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            "</head>\n<body>\n" + body + "\n</body>\n</html>\n")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(html)
    print(f"{OUT} 생성 완료 — {len(html.encode()):,} bytes")


if __name__ == "__main__":
    main()
