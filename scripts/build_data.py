#!/usr/bin/env python3
"""data/list_conf.csv 의 학회 목록을 ccfddl(ccf-deadlines) 데이터셋과 매칭하여
docs/data/conferences.json 을 생성한다.

사용법:
    git clone --depth 1 https://github.com/ccfddl/ccf-deadlines.git /tmp/ccfddl
    python3 scripts/build_data.py --ccfddl /tmp/ccfddl/conference

이후 ICS 피드 재생성:
    python3 scripts/generate_ics.py
"""
import argparse
import csv
import json
import re
from datetime import date, timedelta
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "list_conf.csv"
OUT_PATH = ROOT / "docs" / "data" / "conferences.json"

# CSV 도메인 접두 번호 → (슬러그, 한국어 라벨)
DOMAINS = {
    "1": ("sys", "시스템/아키텍처"),
    "2": ("ai", "인공지능"),
    "3": ("data", "데이터/웹"),
    "4": ("net", "네트워크/통신"),
    "5": ("sec", "보안"),
    "6": ("plse", "PL/SE"),
    "7": ("hci", "HCI/그래픽스"),
    "8": ("theory", "알고리즘/이론"),
    "9": ("hw", "HW/로보틱스"),
    "10": ("arvr", "AR/VR"),
    "11": ("health", "헬스/바이오"),
    "12": ("etc", "기타"),
}

# CSV 약어 → ccfddl (title, sub 카테고리 제한 | None)
ALIASES = {
    "EUROSYS": ("EuroSys", None),
    "USENIX ATC": ("SIGOPS ATC", None),
    "USENIX OSDI": ("OSDI", None),
    "USENIX FAST": ("FAST", None),
    "USENIX NSDI": ("NSDI", None),
    "USENIX SECURITY": ("USENIX Security", None),
    "SEC": ("SEC", "DS"),          # 엣지컴퓨팅 (보안 SEC와 구분)
    "FSE": ("FSE", "SE"),          # SW공학 (암호 FSE와 구분)
    "ISC": (None, None),           # ccfddl ISC는 보안 학회 → 미매칭 처리
    "SOCC": ("SoCC", None),
    "MIDDLEWARE": ("Middleware", None),
    "VR": ("IEEE VR", None),
    "INTERSPEECH": ("InterSpeech", None),
    "CEC": ("IEEE CEC", None),
    "NAACL/HLT": ("NAACL", None),
    "SIGKDD": ("SIGKDD", None),
    "BIGDATA": ("BigData", None),
    "VLDB/PVLDB": ("VLDB", None),
    "ECML PKDD": ("ECML-PKDD", None),
    "MOBICOM": ("MobiCom", None),
    "SP": ("S&P", None),
    "CGO": ("IEEE/ACM CGO", None),
    "MMSYS": ("MMSys", None),
    "UBICOMP": ("UbiComp/ISWC", None),
    "SIGGRAPH": ("ACM SIGGRAPH", None),
    "SIGGRAPH-ASIA": ("ACM SIGGRAPH ASIA", None),
    "VAST": ("IEEE VIS", None),    # VAST는 IEEE VIS로 통합됨
    "TACAS": ("ETAPS", None),      # TACAS는 ETAPS 산하 (마감 공유)
    "ISWC": ("ISWC", "DB"),        # 시맨틱웹 (웨어러블 ISWC와 구분)
}

# 매칭 실패가 정상인 항목(ccfddl 미수록): 빈 마감일로 수록만 한다.
KNOWN_UNMATCHED_NOTE = "공식 마감일 데이터 미확보 — 공식 사이트를 확인하세요."

# ccfddl에 아직 없는 공식 확인 일정 (2026-07-14 웹 조사 기준).
# ccfddl 매칭 결과에 '확정된 미래 마감'이 없을 때만 적용된다.
OVERRIDES = {
    "iclr": {
        "name": "ICLR 2027",
        "location": "브라질",
        "confText": "April 24-28, 2027",
        "url": "https://iclr.cc",
        "tz": "AoE",
        "deadlines": [
            {"type": "abstract", "label": "초록 마감", "date": "2026-09-19", "status": "confirmed"},
            {"type": "paper", "label": "논문 마감", "date": "2026-09-24", "status": "confirmed"},
        ],
    },
    "cvpr": {
        "name": "CVPR 2027",
        "location": "미정",
        "confText": "June 20-25, 2027",
        "url": "https://cvpr.thecvf.com",
        "tz": "AoE",
        "deadlines": [
            {"type": "abstract", "label": "논문 등록(초록) 마감", "date": "2026-11-15", "status": "confirmed"},
            {"type": "paper", "label": "논문 마감 (예상)", "date": "2026-11-19", "status": "estimated"},
        ],
    },
    "emnlp": {
        "name": "EMNLP 2026",
        "location": "헝가리",
        "confText": "November 2026",
        "url": "https://2026.emnlp.org",
        "tz": "AoE",
        "deadlines": [
            {"type": "paper", "label": "ARR 논문 마감", "date": "2026-05-25", "status": "confirmed"},
            {"type": "etc", "label": "커밋먼트 마감", "date": "2026-08-02", "status": "confirmed"},
        ],
    },
}


def norm(s: str) -> str:
    s = re.sub(r"\(easy\)|\(W/S\)", "", s, flags=re.I)
    return re.sub(r"\s+", " ", s).strip().upper()


def clean_text(s: str) -> str:
    # CSV에서 쉼표 대체 문자("&  ")를 복원하고 공백을 정리
    return re.sub(r"\s+", " ", s.replace("&  ", ", ")).strip()


def load_csv():
    rows = []
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        for r in reader:
            if not r or not r[0].strip():
                continue
            domain_raw = r[0].strip()
            name = clean_text(r[1]) if len(r) > 1 else ""
            full = clean_text(r[2]) if len(r) > 2 else ""
            rating = (r[3].strip() if len(r) > 3 else "") or "우수"
            m = re.match(r"(\d+)\.", domain_raw)
            if not m or not name:
                continue
            slug, label = DOMAINS[m.group(1)]
            rows.append({
                "abbr": name, "fullName": full, "rating": rating,
                "domain": slug, "domainLabel": label,
            })
    return rows


def load_ccfddl(conf_dir: Path):
    """(TITLE_UPPER, sub) → entry 및 TITLE_UPPER → [entry] 인덱스 구축."""
    by_title = {}
    for path in sorted(conf_dir.glob("*/*.yml")):
        try:
            docs = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        for entry in docs or []:
            title = str(entry.get("title", "")).strip()
            if title:
                by_title.setdefault(title.upper(), []).append(entry)
    return by_title


def find_entry(by_title, abbr):
    key = norm(abbr)
    if key in ALIASES:
        title, sub = ALIASES[key]
        if title is None:
            return None
        cands = by_title.get(title.upper(), [])
        if sub:
            cands = [e for e in cands if e.get("sub") == sub]
        return cands[0] if cands else None
    cands = by_title.get(key, [])
    return cands[0] if len(cands) == 1 else (cands[0] if cands else None)


DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def parse_dl(value):
    if not value or "TBD" in str(value).upper():
        return None
    m = DATE_RE.search(str(value))
    return date.fromisoformat(m.group(1)) if m else None


def timeline_events(cycle):
    """한 개최 사이클의 timeline → [(type, label, date)]"""
    events = []
    for item in cycle.get("timeline") or []:
        comment = str(item.get("comment") or "").strip()
        ad = parse_dl(item.get("abstract_deadline"))
        if ad:
            events.append(("abstract", "초록 마감", ad))
        d = parse_dl(item.get("deadline"))
        if d:
            low = comment.lower()
            if "abstract" in low or "registration" in low:
                events.append(("abstract", comment or "초록 마감", d))
            elif comment:
                events.append(("paper", f"논문 마감 ({comment})", d))
            else:
                events.append(("paper", "논문 마감", d))
    return events


def pick_cycle(entry, today):
    """미래 마감이 있는 가장 이른 사이클을 고르고, 없으면 최신 사이클."""
    cycles = sorted(entry.get("confs") or [], key=lambda c: c.get("year", 0))
    future = []
    for c in cycles:
        evs = timeline_events(c)
        if any(d >= today for _, _, d in evs):
            future.append((min(d for _, _, d in evs if d >= today), c))
    if future:
        return min(future, key=lambda x: x[0])[1], False
    return (cycles[-1], True) if cycles else (None, True)


def cycle_gap(entry):
    years = sorted({c.get("year") for c in entry.get("confs") or [] if c.get("year")})
    if len(years) >= 2 and all(b - a == 2 for a, b in zip(years, years[1:])):
        return 2
    return 1


def build(conf_dir: Path):
    today = date.today()
    rows = load_csv()
    by_title = load_ccfddl(conf_dir)

    out, matched, unmatched = [], 0, []
    seen = set()
    for row in rows:
        key = norm(row["abbr"])
        if key in seen:  # (W/S) 등 본 학회와 중복되는 행은 병합
            continue
        seen.add(key)

        entry = find_entry(by_title, row["abbr"])
        conf_id = re.sub(r"[^a-z0-9]+", "-", row["abbr"].lower()).strip("-")
        base = {
            "id": conf_id,
            "name": row["abbr"],
            "fullName": row["fullName"],
            "field": row["domain"],
            "rating": row["rating"],
        }

        if not entry:
            unmatched.append(row["abbr"])
            out.append({**base, "location": "미확인", "confText": "일정 미확인",
                        "url": "", "note": KNOWN_UNMATCHED_NOTE, "deadlines": []})
            continue

        matched += 1
        cycle, is_past_only = pick_cycle(entry, today)
        if cycle is None:
            out.append({**base, "location": "미확인", "confText": "일정 미확인",
                        "url": "", "note": KNOWN_UNMATCHED_NOTE, "deadlines": []})
            continue

        year = cycle.get("year")
        events = timeline_events(cycle)
        deadlines = [
            {"type": t, "label": lbl, "date": d.isoformat(), "status": "confirmed"}
            for t, lbl, d in events
        ]
        name = f"{row['abbr']} {year}" if year else row["abbr"]
        location = str(cycle.get("place") or "미정").strip()
        conf_text = str(cycle.get("date") or "").strip() or None
        url = str(cycle.get("link") or "").strip()
        tz = str(cycle.get("timezone") or "").strip()

        # 최신 사이클의 마감이 모두 지났으면 다음 사이클 예상 마감을 추가
        if is_past_only and events:
            gap = cycle_gap(entry)
            last = max(events, key=lambda e: e[2])
            est = last[2] + timedelta(days=365 * gap)
            if est >= today:
                next_year = (year or today.year) + gap
                name = f"{row['abbr']} {next_year}"
                location, conf_text, tz = "미정", f"{next_year}년 (예정)", tz
                deadlines = [{
                    "type": "paper", "label": "논문 마감 (예상)",
                    "date": est.isoformat(), "status": "estimated",
                }]
            # 예상일도 과거라면(폐지/장기 미개최) 최신 실적만 남긴다

        result = {**base, "name": name, "location": location or "미정",
                  "confText": conf_text, "url": url, "tz": tz,
                  "deadlines": deadlines}

        has_future_confirmed = any(
            d["status"] == "confirmed" and d["date"] >= today.isoformat()
            for d in deadlines
        )
        if conf_id in OVERRIDES and not has_future_confirmed:
            result.update(OVERRIDES[conf_id])

        out.append(result)

    def sort_key(c):
        future = [d["date"] for d in c["deadlines"] if d["date"] >= today.isoformat()]
        return (0, min(future)) if future else (1, c["name"])

    out.sort(key=sort_key)

    data = {
        "updated": today.isoformat(),
        "note": ("마감일은 각 학회 공지 기준(대부분 AoE/UTC-12)입니다. "
                 "'estimated' 항목은 직전 개최 패턴 기반 예상 일정이며, "
                 "등급(rating)은 data/list_conf.csv 기준입니다."),
        "conferences": out,
    }
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    total_dl = sum(len(c["deadlines"]) for c in out)
    print(f"학회 {len(out)}개 (ccfddl 매칭 {matched}개), 마감 이벤트 {total_dl}개")
    if unmatched:
        print("미매칭:", ", ".join(unmatched))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ccfddl", required=True,
                    help="ccf-deadlines 저장소의 conference/ 디렉터리 경로")
    args = ap.parse_args()
    build(Path(args.ccfddl))
