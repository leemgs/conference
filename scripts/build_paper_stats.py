#!/usr/bin/env python3
"""DBLP 검색 API로 학회별 연도별 등재 논문 수를 집계하여
docs/data/paper_stats.json 을 갱신한다.

- 대상 학회와 DBLP 스트림 키(dblp 필드)는 기존 paper_stats.json 의
  venues 목록을 그대로 사용한다. 학회를 추가하려면 venues 에
  {"id", "label", "dblp"} 항목을 넣고 이 스크립트를 다시 실행하면 된다.
- DBLP 집계는 해당 연도 프로시딩에 등재된 전체 레코드 수 기준이므로
  front matter 등이 소량 포함될 수 있다(학회 발표 채택 수와 근사).

사용법:
    python3 scripts/build_paper_stats.py                 # 최근 6개년
    python3 scripts/build_paper_stats.py --from 2018 --to 2025
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "docs" / "data" / "paper_stats.json"
API = "https://dblp.org/search/publ/api"
PAUSE_SEC = 2.0  # DBLP rate limit 예의상 요청 간격


def dblp_count(stream: str, year: int) -> int | None:
    """스트림(예: conf/nips)의 특정 연도 등재 레코드 수. 실패 시 None."""
    query = f"stream:streams/{stream}: year:{year}:"
    url = f"{API}?{urllib.parse.urlencode({'q': query, 'format': 'json', 'h': 0})}"
    req = urllib.request.Request(url, headers={"User-Agent": "conference-dashboard/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        return int(data["result"]["hits"]["@total"])
    except Exception as exc:  # noqa: BLE001 - 네트워크/파싱 실패는 건너뛴다
        print(f"  ! {stream} {year}: {exc}", file=sys.stderr)
        return None


def main() -> None:
    this_year = date.today().year
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="year_from", type=int, default=this_year - 6)
    ap.add_argument("--to", dest="year_to", type=int, default=this_year)
    args = ap.parse_args()

    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    failed = 0

    for venue in stats["venues"]:
        stream = venue.get("dblp")
        if not stream:
            continue
        print(f"{venue['label']} ({stream})")
        years = {}
        for year in range(args.year_from, args.year_to + 1):
            count = dblp_count(stream, year)
            time.sleep(PAUSE_SEC)
            if count is None:
                failed += 1
            elif count > 0:
                years[str(year)] = count
                print(f"  {year}: {count}")
        if years:
            venue["years"] = years
            venue["approx"] = False

    stats["updated"] = date.today().isoformat()
    if all(not v.get("approx") for v in stats["venues"]):
        stats["source"] = "dblp"
        stats["note"] = ("DBLP 프로시딩 등재 레코드 수 기준입니다(front matter 등 소량 포함 가능). "
                         "scripts/build_paper_stats.py 로 갱신합니다.")
    STATS_PATH.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")
    print(f"저장: {STATS_PATH}" + (f" (실패 {failed}건)" if failed else ""))


if __name__ == "__main__":
    main()
