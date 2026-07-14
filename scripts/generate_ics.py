#!/usr/bin/env python3
"""docs/data/conferences.json 을 읽어 구독 가능한 ICS 피드(docs/conferences.ics)를 생성한다.

사용법:
    python3 scripts/generate_ics.py
"""
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "conferences.json"
OUT = ROOT / "docs" / "conferences.ics"

STATUS_LABEL = {"confirmed": "확정", "estimated": "예상"}


def esc(text: str) -> str:
    """ICS 텍스트 필드 이스케이프 (RFC 5545)."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def fold(line: str) -> str:
    """75옥텟 초과 라인 폴딩 (RFC 5545 3.1)."""
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return line
    parts = []
    cur = b""
    limit = 74  # 이어지는 줄은 선행 공백 1바이트 포함
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > limit:
            parts.append(cur)
            cur = b
        else:
            cur += b
    parts.append(cur)
    return "\r\n ".join(p.decode("utf-8") for p in parts)


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//leemgs//ai-conference-deadlines//KO",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        fold("X-WR-CALNAME:AI 학회 논문 마감일"),
        fold("X-WR-CALDESC:탑티어 AI 학회 논문 제출 마감일 (AoE 기준)"),
    ]

    for conf in data["conferences"]:
        for dl in conf["deadlines"]:
            d = date.fromisoformat(dl["date"])
            status = STATUS_LABEL.get(dl["status"], dl["status"])
            uid = f"{conf['id']}-{dl['type']}-{dl['date']}@leemgs.github.io"
            summary = f"[{conf['name']}] {dl['label']} ({status})"
            desc = (
                f"{conf['fullName']}\n"
                f"장소: {conf['location']}\n"
                f"마감 기준시: {conf.get('tz') or '학회 공지 참조'}\n"
                f"공식 사이트: {conf.get('url') or '-'}"
            )
            lines += [
                "BEGIN:VEVENT",
                fold(f"UID:{uid}"),
                f"DTSTAMP:{now}",
                f"DTSTART;VALUE=DATE:{d.strftime('%Y%m%d')}",
                f"DTEND;VALUE=DATE:{(d + timedelta(days=1)).strftime('%Y%m%d')}",
                fold(f"SUMMARY:{esc(summary)}"),
                fold(f"DESCRIPTION:{esc(desc)}"),
            ]
            if conf.get("url"):
                lines.append(fold(f"URL:{conf['url']}"))
            lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    OUT.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")
    count = sum(len(c["deadlines"]) for c in data["conferences"])
    print(f"OK: {OUT.relative_to(ROOT)} 생성 (이벤트 {count}개)")


if __name__ == "__main__":
    main()
