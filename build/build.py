#!/usr/bin/env python3
"""테크젠 법정의무교육 이수관리 HTML 빌드 스크립트.

원본 엑셀(학습자명단 시트 2개)에서 명단을 추출해 단일 HTML로 합칩니다.
    python3 build/build.py "원본.xlsx"
"""
import json, sys, os
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, '테크젠_법정의무교육_이수관리.html')
PARTS = ['part1.html', 'part2.html', 'part3.js', 'part4.js', 'part5.js', 'part6.js']


def read_sheet(wb, name):
    """헤더 4행 아래부터 학습자 행을 읽어 사번을 키로 반환."""
    ws, out = wb[name], {}
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[1] is None:
            continue
        out[str(r[2]).strip()] = dict(
            name=str(r[1]).strip(), emp=str(r[2]).strip(), email=(r[3] or '').strip(),
            tel=str(r[4] or '').strip(), up=(r[5] or '').strip(),
            dept=(r[6] or '').strip(), pos=(r[7] or '').strip())
    return out


def main(xlsx):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    dis = read_sheet(wb, '학습자명단(장애인)')   # 장애인 인식개선 미이수자
    har = read_sheet(wb, '학습자명단(성희롱)')   # 성희롱 예방교육 미이수자

    merged = {}
    merged.update(har)
    merged.update(dis)
    rows = []
    for emp, p in merged.items():
        # h/d = 1 이면 이수, 0 이면 미이수 (미이수자 시트에 있으면 0)
        rows.append({**p, 'h': 0 if emp in har else 1, 'd': 0 if emp in dis else 1})
    rows.sort(key=lambda x: (x['up'], x['dept'], x['pos'], x['name']))

    data = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
    meta = json.dumps({'src': os.path.basename(xlsx), 'total': len(rows)}, ensure_ascii=False)
    html = ''.join(open(os.path.join(HERE, n), encoding='utf-8').read() for n in PARTS)
    html = html.replace('__DATA__', data).replace('__META__', meta)
    open(OUT, 'w', encoding='utf-8').write(html)
    print(f'{OUT} 생성 완료 — {len(rows)}명, {len(html.encode()):,} bytes')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'source.xlsx'))
