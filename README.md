# 🎓 탑티어 학회 마감일 캘린더 (Top Conference Deadlines Calendar)

**https://leemgs.github.io/conference/**

[`data/list_conf.csv`](data/list_conf.csv)에 정리된 **12개 분야, 185개 탑티어 학회**(ICML,
AAAI, CVPR, SOSP, SIGCOMM, CHI, PLDI 등)의 논문 제출 마감일을 한눈에 볼 수 있는 캘린더
웹사이트입니다. [leemgs/webinar](https://github.com/leemgs/webinar)의
"데이터(JSON) → 월별 캘린더 홈페이지 + ICS 구독 피드" 구조를 그대로 따랐습니다.

## ✨ 주요 기능

- **🗓️ 월별 달력 뷰** — 마감일을 달력 그리드에 분야별 색상으로 표시
- **📋 목록 뷰** — 다가오는 마감을 D-day 카운트다운과 함께 정렬, 지난 마감·미확인 학회는 접이식 분리
- **🔍 검색·필터** — 학회 약어·전체 이름 검색, 결과별 인터넷 검색 팝업 / 분야 12종(시스템·AI·데이터·네트워크·보안·PL/SE·HCI·이론·HW·AR/VR·헬스·기타) / 상태(✅ 확정 · 🔮 예상)
- **🏆 등급 배지** — `data/list_conf.csv` 기준 최우수/우수 등급 표시
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
│   │   └── conferences.json # 마감일 데이터 (빌드 산출물, 진실의 원천 ②)
│   └── conferences.ics      # 구독용 ICS 피드 (자동 생성물)
├── scripts/
│   ├── build_data.py        # CSV + ccfddl → conferences.json 생성
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

## 🚀 로컬 실행

```bash
python3 -m http.server 8000 --directory docs
# http://localhost:8000 접속
```

## 🌐 GitHub Pages 배포

저장소 **Settings → Pages → Source**에서 `main` 브랜치의 `/docs` 폴더를 지정하면
https://leemgs.github.io/conference/ 로 서비스됩니다.
