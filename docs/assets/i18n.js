/* 다국어(한국어/English) 사전 및 전환 유틸리티 */
(function () {
  "use strict";

  window.I18N = {
    "app.title": { ko: "탑티어 학회 마감일 캘린더", en: "Top-Tier Conference Deadline Calendar" },
    "app.description": {
      ko: "ICML, AAAI, CVPR 등 12개 분야 185개 탑티어 학회의 논문 제출 마감일을 한눈에 보는 캘린더",
      en: "A calendar of paper submission deadlines for 185 top-tier conferences across 12 fields, including ICML, AAAI, and CVPR",
    },
    "brand.h1": { ko: "🎓 탑티어 학회 마감일 캘린더", en: "🎓 Top-Tier Conference Deadline Calendar" },
    "brand.tagline": {
      ko: "ICML · AAAI · CVPR 등 12개 분야, 185개 탑티어 학회 논문 제출 일정 모음",
      en: "Paper submission schedules for 185 top-tier conferences across 12 fields, including ICML, AAAI, and CVPR",
    },

    "header.ics": { ko: "📅 캘린더 구독 (ICS)", en: "📅 Subscribe (ICS)" },
    "header.ics.title": { ko: "구글 캘린더 등에서 URL로 구독할 수 있습니다", en: "Subscribe via URL in Google Calendar and similar apps" },
    "header.updated": { ko: "업데이트: {date}", en: "Updated: {date}" },

    "lang.switchTo": { ko: "EN", en: "한글" },
    "lang.toggleAria": { ko: "언어 전환: English로 보기", en: "Switch language: view in Korean" },

    "view.tablist": { ko: "보기 전환", en: "Switch view" },
    "view.calendar": { ko: "🗓️ 달력", en: "🗓️ Calendar" },
    "view.list": { ko: "📋 목록", en: "📋 List" },
    "view.dashboard": { ko: "📊 대시보드", en: "📊 Dashboard" },

    "search.label": { ko: "검색", en: "Search" },
    "search.placeholder": { ko: "학회명 검색 (예: CVPR, Machine Learning)", en: "Search conferences (e.g. CVPR, Machine Learning)" },
    "search.clear": { ko: "검색어 지우기", en: "Clear search" },
    "search.heading": { ko: "학회 검색 결과", en: "Conference Search Results" },
    "search.heading.count": { ko: "학회 검색 결과 ({n}개)", en: "Conference Search Results ({n})" },
    "search.empty": { ko: "일치하는 학회 정보가 없습니다.", en: "No matching conferences found." },

    "field.label": { ko: "분야", en: "Field" },
    "status.label": { ko: "상태", en: "Status" },
    "common.all": { ko: "전체", en: "All" },
    "status.confirmed": { ko: "✅ 확정", en: "✅ Confirmed" },
    "status.estimated": { ko: "🔮 예상", en: "🔮 Estimated" },
    "table.confirmed": { ko: "확정", en: "Confirmed" },
    "table.estimated": { ko: "예상", en: "Estimated" },

    "field.sys": { ko: "시스템/아키텍처", en: "Systems/Architecture" },
    "field.ai": { ko: "인공지능", en: "Artificial Intelligence" },
    "field.data": { ko: "데이터/웹", en: "Data/Web" },
    "field.net": { ko: "네트워크/통신", en: "Networking" },
    "field.sec": { ko: "보안", en: "Security" },
    "field.plse": { ko: "PL/SE", en: "PL/SE" },
    "field.hci": { ko: "HCI/그래픽스", en: "HCI/Graphics" },
    "field.theory": { ko: "알고리즘/이론", en: "Algorithms/Theory" },
    "field.hw": { ko: "HW/로보틱스", en: "HW/Robotics" },
    "field.arvr": { ko: "AR/VR", en: "AR/VR" },
    "field.health": { ko: "헬스/바이오", en: "Health/Bio" },
    "field.etc": { ko: "기타", en: "Other" },

    "weekday.sun": { ko: "일", en: "Sun" },
    "weekday.mon": { ko: "월", en: "Mon" },
    "weekday.tue": { ko: "화", en: "Tue" },
    "weekday.wed": { ko: "수", en: "Wed" },
    "weekday.thu": { ko: "목", en: "Thu" },
    "weekday.fri": { ko: "금", en: "Fri" },
    "weekday.sat": { ko: "토", en: "Sat" },

    "month.1": { ko: "1월", en: "Jan" },
    "month.2": { ko: "2월", en: "Feb" },
    "month.3": { ko: "3월", en: "Mar" },
    "month.4": { ko: "4월", en: "Apr" },
    "month.5": { ko: "5월", en: "May" },
    "month.6": { ko: "6월", en: "Jun" },
    "month.7": { ko: "7월", en: "Jul" },
    "month.8": { ko: "8월", en: "Aug" },
    "month.9": { ko: "9월", en: "Sep" },
    "month.10": { ko: "10월", en: "Oct" },
    "month.11": { ko: "11월", en: "Nov" },
    "month.12": { ko: "12월", en: "Dec" },

    "cal.prev": { ko: "이전 달", en: "Previous month" },
    "cal.next": { ko: "다음 달", en: "Next month" },
    "cal.today": { ko: "오늘", en: "Today" },
    "cal.moreCount": { ko: "+{n}개 더보기", en: "+{n} more" },
    "cal.title": { ko: "{year}년 {monthLabel}", en: "{monthLabel} {year}" },

    "type.abstract": { ko: "초록", en: "Abstract" },
    "type.paper": { ko: "논문", en: "Paper" },
    "type.other": { ko: "기타", en: "Other" },

    "rating.top": { ko: "최우수", en: "Top-tier" },
    "rating.good": { ko: "우수", en: "Excellent" },
    "rating.none": { ko: "미지정", en: "Unrated" },

    "confPeriod.tbd": { ko: "일정 미정", en: "TBD" },

    "list.heading": { ko: "다가오는 마감", en: "Upcoming Deadlines" },
    "list.pastSummary": { ko: "지난 마감 보기", en: "Show past deadlines" },
    "list.unknownSummary": { ko: "마감일 미확인 학회 보기", en: "Show conferences without confirmed deadlines" },
    "list.upcomingEmpty": { ko: "다가오는 마감이 없습니다.", en: "No upcoming deadlines." },
    "list.unknown": { ko: "미확인", en: "TBD" },

    "board.heading": { ko: "학회 목록", en: "Conference List" },
    "board.heading.count": { ko: "학회 목록 ({n}개)", en: "Conference List ({n})" },
    "board.perPage": { ko: "페이지당 표시", en: "Per page" },
    "board.no": { ko: "번호", en: "No." },
    "board.cat": { ko: "대분야", en: "Category" },
    "board.subcat": { ko: "소분야", en: "Subfield" },
    "board.abbr": { ko: "약칭", en: "Abbr." },
    "board.name": { ko: "학회명", en: "Conference" },
    "board.rating": { ko: "등급", en: "Grade" },
    "board.note": { ko: "비고", en: "Notes" },
    "board.note.noDeadline": { ko: "마감일 미확인", en: "Deadline TBD" },
    "board.note.estimated": { ko: "🔮 예상 일정", en: "🔮 Estimated schedule" },
    "board.empty": { ko: "표시할 학회가 없습니다.", en: "No conferences to display." },
    "board.prev": { ko: "이전 페이지", en: "Previous page" },
    "board.next": { ko: "다음 페이지", en: "Next page" },
    "board.pagerAria": { ko: "페이지 이동", en: "Pagination" },

    "card.detailsBtn": { ko: "마감일 및 개최 정보 보기", en: "View deadlines & details" },
    "card.webSearchBtn": { ko: "🌐 인터넷에서 검색", en: "🌐 Search the web" },
    "card.fullNameLabel": { ko: "학회명", en: "Full Name" },
    "card.ratingLabel": { ko: "등급", en: "Rating" },

    "unit.count": { ko: "{n}개", en: "{n}" },
    "unit.cases": { ko: "{n}건", en: "{n}" },
    "unit.venues": { ko: "{n}곳", en: "{n}" },
    "dash.total": { ko: "합계", en: "Total" },
    "dash.confCount": { ko: "학회 수", en: "Conferences" },
    "dash.tableToggle": { ko: "표로 보기", en: "View as table" },

    "dash.tile.total": { ko: "전체 학회", en: "Total Conferences" },
    "dash.tile.top": { ko: "최우수 학회", en: "Top-Tier Conferences" },
    "dash.tile.good": { ko: "우수 학회", en: "Excellent Conferences" },
    "dash.tile.thisMonth": { ko: "이번 달 마감 ({monthLabel})", en: "This Month's Deadlines ({monthLabel})" },
    "dash.tile.fieldsCount": { ko: "{n}개 분야", en: "{n} fields" },
    "dash.tile.pctOfTotal": { ko: "전체의 {pct}%", en: "{pct}% of total" },
    "dash.tile.confirmedEstimated": { ko: "확정 {c} · 예상 {e}", en: "Confirmed {c} · Estimated {e}" },

    "dash.domain.title": { ko: "카테고리별 학회 등급 현황", en: "Ratings by Category" },
    "dash.domain.sub": { ko: "도메인별 최우수·우수 학회 수 (전체 기간 기준)", en: "Top-tier/excellent counts by domain (all-time)" },
    "dash.domain.ariaBar": {
      ko: "{field}: 최우수 {top}개, 우수 {good}개, 합계 {total}개",
      en: "{field}: {top} top-tier, {good} excellent, {total} total",
    },

    "dash.month.title": { ko: "월별 학회 현황", en: "Monthly Overview" },
    "dash.month.sub": {
      ko: "향후 12개월 논문·초록 마감 건수 — 월을 누르면 해당 월 목록이 표시됩니다",
      en: "Paper/abstract deadlines for the next 12 months — click a month to see its list",
    },
    "dash.month.aria": {
      ko: "{year}년 {monthLabel}: 논문 마감 {paper}건, 초록 마감 {abstract}건 (학회 {confCount}곳)",
      en: "{monthLabel} {year}: {paper} paper, {abstract} abstract deadlines ({confCount} conferences)",
    },
    "dash.month.legend.paper": { ko: "논문 마감", en: "Paper deadlines" },
    "dash.month.legend.abstract": { ko: "초록 마감", en: "Abstract deadlines" },
    "dash.month.tip.confirmedEstimated": { ko: "확정 · 예상", en: "Confirmed · Estimated" },
    "dash.month.detailHeading": { ko: "{year}년 {monthLabel} 마감 목록 ({count}건)", en: "{monthLabel} {year} Deadlines ({count})" },
    "dash.month.detailEmpty": { ko: "이 달에는 등록된 마감이 없습니다.", en: "No deadlines this month." },
    "dash.month.table.month": { ko: "월", en: "Month" },
    "dash.month.table.count": { ko: "마감 건수", en: "Deadlines" },

    "dash.papers.title": { ko: "매년 학회별 등재 논문 수", en: "Accepted Papers per Year" },
    "dash.papers.selectLabel": { ko: "학회 선택", en: "Select conference" },
    "dash.papers.empty": {
      ko: "논문 수 데이터가 아직 없습니다. scripts/build_paper_stats.py 를 실행해 docs/data/paper_stats.json 을 생성하세요.",
      en: "Paper-count data isn't available yet. Run scripts/build_paper_stats.py to generate docs/data/paper_stats.json.",
    },
    "dash.papers.approx": { ko: "약 ", en: "approx. " },
    "dash.papers.aria": { ko: "{label} {year}년: {valueText}", en: "{label} {year}: {valueText}" },
    "dash.papers.tip.title": { ko: "{label} {year}년", en: "{label} {year}" },
    "dash.papers.tip.accepted": { ko: "등재 논문", en: "Accepted papers" },
    "dash.papers.table.year": { ko: "연도", en: "Year" },
    "dash.papers.table.count": { ko: "논문 수", en: "Papers" },
    "papers.valueWithUnit": { ko: "{approx}{n}편", en: "{approx}{n}" },

    "dash.papers.countries.detailHeading": { ko: "{label} {year}년 제1저자 국가별 논문 수", en: "{label} {year} Papers by First Author's Country" },
    "dash.papers.countries.empty": { ko: "{label} {year}에 대한 국가별 데이터가 아직 준비되지 않았습니다.", en: "Country breakdown not available yet for {label} {year}." },
    "dash.papers.countries.other": { ko: "기타", en: "Other" },
    "dash.papers.countries.unknownNote": { ko: "{n}편은 저자 소속 정보가 확인되지 않아 집계에서 제외되었습니다.", en: "{n} papers are excluded due to unavailable affiliation data." },
    "dash.papers.countries.ariaBar": { ko: "{country} {count}편 ({pct}%)", en: "{country}: {count} papers ({pct}%)" },
    "dash.papers.countries.tip.share": { ko: "{pct}% ({count}편)", en: "{pct}% ({count} papers)" },
    "dash.papers.countries.table.country": { ko: "국가", en: "Country" },
    "dash.papers.countries.table.count": { ko: "논문 수", en: "Papers" },

    "modal.close": { ko: "닫기", en: "Close" },
    "modal.location": { ko: "장소", en: "Location" },
    "modal.dates": { ko: "개최", en: "Dates" },
    "modal.tz": { ko: "기준시", en: "Timezone" },
    "modal.tzDefault": { ko: "학회 공지 참조", en: "See official site" },
    "modal.noDeadlines": { ko: "등록된 마감 일정이 없습니다.", en: "No deadlines listed." },
    "modal.addToGCal": { ko: "＋ 구글 캘린더에 추가", en: "＋ Add to Google Calendar" },
    "modal.officialSite": { ko: "공식 사이트 ↗", en: "Official site ↗" },
    "modal.gcalDetails": { ko: "AoE(UTC-12) 기준 마감", en: "Deadline in AoE (UTC-12)" },

    "footer.deadlineNote": {
      ko: "마감일은 각 학회 공지 기준(대부분 <strong>AoE, UTC-12</strong>)입니다.",
      en: "Deadlines follow each conference's own announcement (mostly <strong>AoE, UTC-12</strong>).",
    },
    "footer.estimatedNote": {
      ko: "표시 일정은 직전 개최 패턴 기반 추정치이므로 반드시 공식 사이트에서 확인하세요.",
      en: "marked schedules are estimates based on prior years — always verify on the official site.",
    },
    "footer.listLabel": { ko: "학회 목록·등급:", en: "Conference list & ratings:" },
    "footer.deadlineDataLabel": { ko: "마감일 데이터:", en: "Deadline data based on" },
    "footer.basedOn": { ko: "기반 ·", en: "·" },
    "footer.sourceLabel": { ko: "소스:", en: "Source:" },

    "empty.default": { ko: "표시할 학회 일정이 없습니다.", en: "No conference schedules to display." },
    "empty.fetchError": { ko: "데이터를 불러오지 못했습니다: {msg}", en: "Failed to load data: {msg}" },
  };

  window.I18N_LANG = localStorage.getItem("conf-lang") || "ko";

  window.t = function t(key, vars) {
    const entry = window.I18N[key];
    if (!entry) return key;
    let s = entry[window.I18N_LANG] || entry.ko;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return s;
  };

  window.setLang = function setLang(lang) {
    window.I18N_LANG = lang;
    localStorage.setItem("conf-lang", lang);
    document.documentElement.lang = lang;
  };

  window.applyTranslations = function applyTranslations(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel)); });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.setAttribute("title", t(el.dataset.i18nTitle)); });
    document.title = t("app.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("app.description"));
  };

  applyTranslations(window.I18N_LANG);
})();
