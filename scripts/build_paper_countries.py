#!/usr/bin/env python3
"""OpenAlex API로 학회별·연도별 제1저자(first author) 소속 국가 분포를 집계하여
docs/data/paper_countries.json 을 갱신한다.

- 대상 학회와 OpenAlex 소스 ID는 docs/data/paper_stats.json 의 venues 목록에서
  읽는다. "openalex"(여러 연도에 걸쳐 안정적인 단일 소스) 또는
  "openalexByYear"(연도별로 별도 소스가 생성되는 학회, 예: IEEE 학회) 필드가
  있는 학회만 대상이 된다. 두 필드 모두 없으면 건너뛴다.
  * OpenAlex의 학회별 색인 완성도는 학회마다 다르다 — 자동으로 검색해 추정하지
    말고, 반드시 사람이 개별 학회의 works_count/연도 범위를 DBLP 집계치와
    대조해 검증한 뒤 이 필드를 채워야 한다 (README/plan 참고).
- OpenAlex는 "제1저자의 국가"를 직접 필터링/집계하는 API가 없으므로, 각 논문의
  전체 저자(authorships) 목록을 받아 author_position == "first" 인 저자의
  institutions[0].country_code 를 스크립트에서 직접 판별한다.
- 기존 파일은 이번 실행에서 다룬 학회/연도만 덮어쓰고 나머지는 보존한다
  (부분 재실행에 안전).

사용법:
    python3 scripts/build_paper_countries.py --mailto you@example.com
    python3 scripts/build_paper_countries.py --venue cvpr --venue aaai --mailto you@example.com
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "docs" / "data" / "paper_stats.json"
COUNTRIES_PATH = ROOT / "docs" / "data" / "paper_countries.json"
API = "https://api.openalex.org"
TOP_N_DEFAULT = 8
PAUSE_SEC_DEFAULT = 1.0


def api_get(path: str, params: dict, mailto: str) -> dict:
    q = dict(params)
    q["mailto"] = mailto
    url = f"{API}{path}?{urllib.parse.urlencode(q)}"
    req = urllib.request.Request(url, headers={"User-Agent": "conference-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def fetch_first_author_countries(source_id: str, year: int, mailto: str, pause: float) -> tuple[dict, int, int]:
    """(국가코드 -> 논문수, unknown 논문수, 전체 논문수) 반환. 실패 시 예외 전파."""
    counts: dict[str, int] = {}
    unknown = 0
    total = 0
    cursor = "*"
    while cursor:
        data = api_get("/works", {
            "filter": f"primary_location.source.id:{source_id},publication_year:{year}",
            "select": "id,authorships",
            "per-page": 200,
            "cursor": cursor,
        }, mailto)
        for work in data["results"]:
            total += 1
            first = next((a for a in work.get("authorships", []) if a.get("author_position") == "first"), None)
            institutions = first.get("institutions") if first else None
            code = institutions[0].get("country_code") if institutions else None
            if code:
                counts[code] = counts.get(code, 0) + 1
            else:
                unknown += 1
        cursor = data.get("meta", {}).get("next_cursor")
        time.sleep(pause)
    return counts, unknown, total


_country_name_cache: dict[str, str] = {}


def country_name(code: str, mailto: str, pause: float) -> str:
    if code not in _country_name_cache:
        try:
            data = api_get(f"/countries/{code}", {}, mailto)
            _country_name_cache[code] = data.get("display_name", code)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! country lookup {code}: {exc}", file=sys.stderr)
            _country_name_cache[code] = code
        time.sleep(pause)
    return _country_name_cache[code]


def venue_year_sources(venue: dict) -> dict[int, str]:
    out: dict[int, str] = {}
    if venue.get("openalex"):
        for year in venue.get("years", {}):
            out[int(year)] = venue["openalex"]
    for year, source_id in venue.get("openalexByYear", {}).items():
        out[int(year)] = source_id
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--venue", action="append", dest="venues", default=None,
                     help="특정 학회 id만 처리 (반복 지정 가능). 기본값: openalex 매핑이 있는 전체 학회")
    ap.add_argument("--top-n", type=int, default=TOP_N_DEFAULT)
    ap.add_argument("--pause-sec", type=float, default=PAUSE_SEC_DEFAULT)
    ap.add_argument("--mailto", default=os.environ.get("OPENALEX_MAILTO"),
                     help="OpenAlex polite pool 연락처 (또는 OPENALEX_MAILTO 환경변수)")
    args = ap.parse_args()

    if not args.mailto:
        print("에러: --mailto 또는 OPENALEX_MAILTO 환경변수가 필요합니다 "
              "(OpenAlex polite pool 정책, 개인 이메일을 소스에 하드코딩하지 않기 위함).",
              file=sys.stderr)
        sys.exit(1)

    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    countries_doc = json.loads(COUNTRIES_PATH.read_text(encoding="utf-8")) if COUNTRIES_PATH.exists() else {
        "updated": None, "source": "openalex", "topN": args.top_n,
        "note": ("OpenAlex 기준 제1저자(first author) 소속 국가 추정치입니다. "
                 "일부 논문은 소속 정보가 없어 집계에서 제외됩니다. "
                 "학회마다 OpenAlex 색인 완성도가 달라, 매핑이 확인된 학회/연도만 표시됩니다."),
        "venues": [],
    }
    by_id = {v["id"]: v for v in countries_doc["venues"]}

    failed = 0
    for venue in stats["venues"]:
        if args.venues and venue["id"] not in args.venues:
            continue
        year_sources = venue_year_sources(venue)
        if not year_sources:
            if args.venues:
                print(f"{venue['label']}: openalex 매핑 없음 — 건너뜀")
            continue

        print(f"{venue['label']} ({venue['id']})")
        entry = by_id.setdefault(venue["id"], {"id": venue["id"], "years": {}})
        for year in sorted(year_sources):
            source_id = year_sources[year]
            try:
                counts, unknown, total = fetch_first_author_countries(source_id, year, args.mailto, args.pause_sec)
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {year} ({source_id}): {exc}", file=sys.stderr)
                failed += 1
                continue

            ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
            top = ranked[: args.top_n]
            rest = sum(c for _, c in ranked[args.top_n:])
            countries = [
                {"code": code, "country": country_name(code, args.mailto, args.pause_sec), "count": c}
                for code, c in top
            ]
            if rest > 0:
                countries.append({"code": "other", "country": None, "count": rest})

            entry["years"][str(year)] = {"total": total, "unknown": unknown, "countries": countries}
            print(f"  {year}: {total}편 (미상 {unknown}) — 상위 {min(len(top), args.top_n)}개국")

    countries_doc["venues"] = list(by_id.values())
    countries_doc["updated"] = date.today().isoformat()
    countries_doc["topN"] = args.top_n
    COUNTRIES_PATH.write_text(json.dumps(countries_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"저장: {COUNTRIES_PATH}" + (f" (실패 {failed}건)" if failed else ""))


if __name__ == "__main__":
    main()
