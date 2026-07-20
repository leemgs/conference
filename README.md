# 🎓 Top Conference Deadlines Calendar

**https://leemgs.github.io/conference/**

각 뷰로 바로 접속할 수 있는 주소:

- 🗓️ 달력: **https://leemgs.github.io/conference/#calendar**
- 📋 목록: **https://leemgs.github.io/conference/#list**
- 📊 대시보드: **https://leemgs.github.io/conference/#dashboard**

[`data/list_conf.csv`](data/list_conf.csv)에 정리된 **12개 분야, 185개 탑티어 학회**(ICML,
AAAI, CVPR, SOSP, SIGCOMM, CHI, PLDI 등)의 논문 제출 마감일을 한눈에 볼 수 있는 캘린더
웹사이트입니다. [leemgs/webinar](https://github.com/leemgs/webinar)의
"데이터(JSON) → 월별 캘린더 홈페이지 + ICS 구독 피드" 구조를 그대로 따랐습니다.

## ✨ 주요 기능

- **🗓️ 월별 달력 뷰** — 마감일을 달력 그리드에 분야별 색상으로 표시
- **📋 목록 뷰** — 다가오는 마감을 D-day 카운트다운과 함께 정렬, 지난 마감·미확인 학회는 접이식 분리
- **🔍 검색·필터** — 학회 약어·전체 이름 검색, 결과별 인터넷 검색 팝업 / 분야 12종(시스템·AI·데이터·네트워크·보안·PL/SE·HCI·이론·HW·AR/VR·헬스·기타) / 상태(✅ 확정 · 🔮 예상)
- **🏆 등급 배지** — `data/list_conf.csv` 기준 최우수/우수 등급 표시
- **📊 대시보드 뷰** — ① 카테고리(도메인)별 최우수·우수 학회 수 ② 향후 12개월 월별 마감 현황(월 클릭 시 해당 월 목록) ③ 매년 학회별 등재 논문 수 차트. 모든 차트는 표 뷰·툴팁·키보드 접근을 지원
- **📅 ICS 구독 피드** — [`docs/conferences.ics`](docs/conferences.ics)를 구글 캘린더 등에서 URL로 구독
- **➕ 구글 캘린더 추가** — 학회 상세 모달에서 다음 마감을 원클릭 등록
- **🌙 다크모드** — 시스템 설정에 따라 자동 전환

> ⚠️ 마감일은 각 학회 공지 기준(대부분 AoE, UTC-12)입니다. `🔮 예상` 일정은 직전 개최
> 패턴 기반 추정치이므로 투고 전 반드시 공식 사이트에서 확인하세요.

## 📁 저장소 구조

```
conference/
├── data/
│   └── list_conf.csv        # 학회 목록·분야·등급 (진실의 원천 ①)
├── docs/                    # GitHub Pages 정적 사이트
│   ├── index.html           # 메인 페이지 (달력/목록 뷰)
│   ├── assets/
│   │   ├── style.css        # 스타일 (다크모드 지원)
│   │   └── app.js           # 캘린더 렌더링/필터/모달 로직
│   ├── data/
│   │   ├── conferences.json # 마감일 데이터 (빌드 산출물, 진실의 원천 ②)
│   │   └── paper_stats.json # 학회별 연도별 논문 수 (대시보드용)
│   └── conferences.ics      # 구독용 ICS 피드 (자동 생성물)
├── scripts/
│   ├── build_data.py        # CSV + ccfddl → conferences.json 생성
│   ├── build_paper_stats.py # DBLP → paper_stats.json 갱신
│   └── generate_ics.py      # conferences.json → ICS 피드 생성
└── README.md
```

## 🔧 마감일 데이터 갱신 방법

마감일은 커뮤니티가 관리하는 [ccfddl/ccf-deadlines](https://github.com/ccfddl/ccf-deadlines)
데이터셋과 CSV를 매칭해 생성합니다.

```bash
# 1. ccfddl 데이터셋 받기
git clone --depth 1 https://github.com/ccfddl/ccf-deadlines.git /tmp/ccfddl

# 2. 데이터 빌드 (docs/data/conferences.json 생성)
python3 scripts/build_data.py --ccfddl /tmp/ccfddl/conference

# 3. ICS 피드 재생성
python3 scripts/generate_ics.py
```

- 학회 추가/삭제/등급 변경은 `data/list_conf.csv`를 수정한 뒤 위 과정을 다시 실행합니다.
- ccfddl에 아직 없는 공식 확정 일정은 `scripts/build_data.py`의 `OVERRIDES`에 추가합니다.
- ccfddl과 매칭되지 않는 일부 학회(ISSCC, LREC 등 30여 개)는 "마감일 미확인"으로 표시됩니다.

## 📊 논문 수 데이터 갱신 방법 (대시보드)

대시보드의 "매년 학회별 등재 논문 수"는 [`docs/data/paper_stats.json`](docs/data/paper_stats.json)을
사용합니다. 초기 시드는 학회 공식 발표 기반 **근사치**이며, 아래 스크립트로 DBLP 등재
기준 실측치로 갱신할 수 있습니다.

```bash
python3 scripts/build_paper_stats.py            # 최근 6개년
python3 scripts/build_paper_stats.py --from 2018 --to 2025
```

- 학회를 추가하려면 `paper_stats.json`의 `venues`에 `{"id", "label", "dblp"}` 항목을 넣고
  스크립트를 다시 실행합니다 (`id`는 `conferences.json`의 id, `dblp`는 `conf/nips` 형태의 DBLP 스트림 키).

## 🚀 로컬 실행

```bash
python3 -m http.server 8000 --directory docs
# http://localhost:8000 접속
```

## 🌐 GitHub Pages 배포

저장소 **Settings → Pages → Source**에서 `main` 브랜치의 `/docs` 폴더를 지정하면
https://leemgs.github.io/conference/ 로 서비스됩니다.

> 💡 `docs/assets/`의 CSS·JS를 수정해 배포할 때는 `docs/index.html`의
> `?v=YYYYMMDD` 버전 쿼리를 함께 올려 주세요. 브라우저가 이전 버전을 캐시하고
> 있어도 새 파일을 강제로 다시 받게 됩니다.
