#!/usr/bin/env python3
"""조각 파일을 합쳐 배포본 HTML을 만듭니다.

    python3 build/build.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "교육계획취합.html")
PARTS = ["p1.html", "p2.html", "p3.js", "p4.js", "p5.js", "p6.js", "p7.js", "p8.js"]

# 실 -> 산하 팀
ORG = {
    "경영지원실": ["재경팀", "사업기획팀", "미래성장팀", "비즈니스솔루션팀"],
    "PT생산실": ["PT생산1팀", "PT생산1팀_서산파견", "PT생산2팀", "PT생산관리팀"],
    "엔진생산실": ["엔진생산1팀", "엔진생산2팀", "엔진생산3팀", "엔진생산관리팀", "엔진보전팀"],
    "품질관리실": ["PT품질관리팀", "엔진품질관리1팀", "엔진품질관리2팀"],
}
# 팀장이 없는 부서는 상위 조직이 결재를 대행
APPROVER_FALLBACK = {"PT생산1팀_서산파견": "PT생산1팀", "엔진보전팀": "엔진생산실"}
ADMINS = ["82211489", "82210465"]  # 이재용, 박동중


def main():
    people = json.load(open(os.path.join(HERE, "roster.json"), encoding="utf-8"))
    rows = [[p["emp"], p["name"], p["dept"], p["position"], p["grade"], p["role"]] for p in people]
    payload = {"R": rows, "ORG": ORG, "FB": APPROVER_FALLBACK, "ADMINS": ADMINS}
    data = "const DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"

    logo = "data:image/png;base64," + open(os.path.join(HERE, "logo.b64")).read().strip()
    html = "".join(open(os.path.join(HERE, n), encoding="utf-8").read() for n in PARTS)
    html = html.replace("<script>\n/* ====", "<script>\n" + data + "/* ====", 1)
    html = html.replace("__LOGO__", logo)
    open(OUT, "w", encoding="utf-8").write(html)
    print(f"{OUT} 생성 완료 — {len(people)}명, {len(html.encode()):,} bytes")


if __name__ == "__main__":
    main()
