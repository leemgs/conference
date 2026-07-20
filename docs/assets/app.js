/* AI 학회 마감일 캘린더 */
(function () {
  "use strict";

  const FIELD_META = {
    sys: { hex: "#1971c2" },
    ai: { hex: "#9c36b5" },
    data: { hex: "#0ca678" },
    net: { hex: "#2f9e44" },
    sec: { hex: "#e03131" },
    plse: { hex: "#e8590c" },
    hci: { hex: "#e64980" },
    theory: { hex: "#5f3dc4" },
    hw: { hex: "#f08c00" },
    arvr: { hex: "#0b7285" },
    health: { hex: "#74b816" },
    etc: { hex: "#868e96" },
  };

  function fieldLabel(key) {
    return t("field." + key);
  }

  function weekdayLabel(i) {
    return t("weekday." + ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][i]);
  }

  const BOARD_PAGE_SIZES = [5, 10, 15, 30, 50, 70, 100];

  function savedPageSize() {
    try {
      const v = parseInt(localStorage.getItem("boardPageSize"), 10);
      return BOARD_PAGE_SIZES.includes(v) ? v : 15;
    } catch (_) {
      return 15;
    }
  }

  const state = {
    view: "calendar",
    field: "all",
    status: "all",
    query: "",
    page: 1, // 목록(게시판) 현재 페이지
    pageSize: savedPageSize(), // 목록(게시판) 페이지당 표시 개수
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-based
    data: null,
    events: [], // { conf, dl, date(Date) }
    paperStats: null,
    paperCountries: null, // 국가별 데이터(로드 실패 시 null 유지)
    dashMonth: null, // 월별 현황에서 선택한 "YYYY-MM"
    paperConf: null, // 논문 수 패널에서 선택한 학회 id
    paperYear: null, // 논문 패널에서 선택한 연도(국가 상세용)
  };

  const $ = (sel) => document.querySelector(sel);

  // 뷰별 직접 접속 주소: #calendar, #list, #dashboard
  const VIEW_HASHES = { calendar: "#calendar", list: "#list", dashboard: "#dashboard" };

  function viewFromHash() {
    const h = location.hash;
    return Object.keys(VIEW_HASHES).find((v) => VIEW_HASHES[v] === h) || null;
  }

  function setView(view, updateHash) {
    if (!VIEW_HASHES[view]) return;
    state.view = view;
    document.querySelectorAll(".view-btn").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (updateHash !== false && location.hash !== VIEW_HASHES[view]) {
      history.replaceState(null, "", VIEW_HASHES[view]);
    }
    render();
  }

  // ── 데이터 로딩 ───────────────────────────
  Promise.all([
    fetch("data/conferences.json").then((r) => r.json()),
    fetch("data/paper_stats.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("data/paper_countries.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
    .then(([data, paperStats, paperCountries]) => {
      state.data = data;
      state.paperStats = paperStats;
      state.paperCountries = paperCountries;
      state.events = flatten(data.conferences);
      renderUpdatedAt();
      buildFieldChips();
      bindControls();
      const hashView = viewFromHash();
      if (hashView) setView(hashView, false);
      else render();
    })
    .catch((err) => {
      $("#empty-msg").hidden = false;
      $("#empty-msg").textContent = t("empty.fetchError", { msg: err.message });
    });

  function renderUpdatedAt() {
    if (state.data) $("#updated-at").textContent = t("header.updated", { date: state.data.updated });
  }

  function flatten(confs) {
    const out = [];
    confs.forEach((conf) => {
      conf.deadlines.forEach((dl) => {
        out.push({ conf, dl, date: parseDate(dl.date) });
      });
    });
    out.sort((a, b) => a.date - b.date);
    return out;
  }

  function parseDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function today0() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  function ddayOf(date) {
    return Math.round((date - today0()) / 86400000);
  }

  function fmtDate(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${weekdayLabel(date.getDay())})`;
  }

  // ── 필터 ─────────────────────────────────
  function buildFieldChips() {
    const wrap = $("#field-filter");
    const all = document.createElement("button");
    all.type = "button";
    all.className = "chip active";
    all.dataset.field = "all";
    all.textContent = t("common.all");
    wrap.appendChild(all);
    Object.keys(FIELD_META).forEach((key) => {
      const meta = FIELD_META[key];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.field = key;
      b.innerHTML = `<span class="dot" style="background:${meta.hex}"></span>${fieldLabel(key)}`;
      wrap.appendChild(b);
    });
  }

  function updateFieldChipLabels() {
    $("#field-filter").querySelectorAll(".chip").forEach((b) => {
      if (b.dataset.field === "all") { b.textContent = t("common.all"); return; }
      const meta = FIELD_META[b.dataset.field];
      b.innerHTML = `<span class="dot" style="background:${meta.hex}"></span>${fieldLabel(b.dataset.field)}`;
    });
  }

  function renderWeekdayHeader() {
    const wd = $("#cal-weekdays");
    wd.innerHTML = "";
    [0, 1, 2, 3, 4, 5, 6].forEach((i) => {
      const s = document.createElement("span");
      s.textContent = weekdayLabel(i);
      if (i === 0) s.className = "sun";
      wd.appendChild(s);
    });
  }

  function filteredEvents() {
    return state.events.filter((ev) => {
      if (state.field !== "all" && ev.conf.field !== state.field) return false;
      if (state.status !== "all" && ev.dl.status !== state.status) return false;
      if (!matchesSearch(ev.conf)) return false;
      return true;
    });
  }

  function matchesSearch(conf) {
    if (!state.query) return true;
    return `${conf.name} ${conf.fullName}`.toLocaleLowerCase().includes(state.query);
  }

  // ── 컨트롤 바인딩 ─────────────────────────
  function bindControls() {
    const search = $("#conference-search");
    const clearSearch = $("#clear-search");
    search.addEventListener("input", () => {
      state.query = search.value.trim().toLocaleLowerCase();
      state.page = 1;
      clearSearch.hidden = search.value.length === 0;
      render();
    });
    clearSearch.addEventListener("click", () => {
      search.value = "";
      state.query = "";
      state.page = 1;
      clearSearch.hidden = true;
      search.focus();
      render();
    });

    $("#field-filter").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.field = btn.dataset.field;
      state.page = 1;
      setActive("#field-filter .chip", btn);
      render();
    });

    $("#status-filter").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.status = btn.dataset.status;
      state.page = 1;
      setActive("#status-filter .chip", btn);
      render();
    });

    const pageSize = $("#page-size");
    pageSize.value = String(state.pageSize);
    pageSize.addEventListener("change", () => {
      state.pageSize = parseInt(pageSize.value, 10) || 15;
      state.page = 1;
      try { localStorage.setItem("boardPageSize", String(state.pageSize)); } catch (_) {}
      render();
    });

    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    // 주소창에서 해시를 바꾸거나 뒤로/앞으로 이동해도 뷰가 따라간다
    window.addEventListener("hashchange", () => {
      const v = viewFromHash();
      if (v && v !== state.view) setView(v, false);
    });

    $("#prev-month").addEventListener("click", () => shiftMonth(-1));
    $("#next-month").addEventListener("click", () => shiftMonth(1));
    $("#today-btn").addEventListener("click", () => {
      const t = new Date();
      state.year = t.getFullYear();
      state.month = t.getMonth();
      render();
    });

    $("#modal").addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    renderWeekdayHeader();

    $("#lang-toggle").addEventListener("click", () => {
      const next = window.I18N_LANG === "ko" ? "en" : "ko";
      setLang(next);
      applyTranslations(next);
      updateFieldChipLabels();
      renderWeekdayHeader();
      renderUpdatedAt();
      render();
    });
  }

  function setActive(selector, activeBtn) {
    document.querySelectorAll(selector).forEach((b) => b.classList.toggle("active", b === activeBtn));
  }

  function shiftMonth(delta) {
    state.month += delta;
    if (state.month < 0) { state.month = 11; state.year--; }
    if (state.month > 11) { state.month = 0; state.year++; }
    render();
  }

  // ── 렌더링 ───────────────────────────────
  function render() {
    const isDash = state.view === "dashboard";
    const isSearch = !isDash && state.query.length > 0;
    const isCal = state.view === "calendar";
    $("#search-view").hidden = !isSearch;
    $("#calendar-view").hidden = isDash || isSearch || !isCal;
    $("#list-view").hidden = isDash || isSearch || isCal;
    $("#dashboard-view").hidden = !isDash;
    document.querySelector(".controls").classList.toggle("dash-mode", isDash);
    document.querySelector(".controls").classList.toggle("cal-mode", isCal && !isSearch);
    $("#empty-msg").hidden = true;
    if (isDash) {
      renderDashboard();
      return;
    }
    if (isSearch) {
      renderSearchResults();
      return;
    }
    if (isCal) {
      renderCalendar();
      renderList();
    } else {
      renderBoard();
    }
  }

  function renderSearchResults() {
    const results = (state.data.conferences || []).filter((conf) => {
      if (state.field !== "all" && conf.field !== state.field) return false;
      return matchesSearch(conf);
    });
    const wrap = $("#search-results");
    wrap.innerHTML = "";
    $("#search-heading").textContent = t("search.heading.count", { n: results.length });

    if (results.length === 0) {
      wrap.innerHTML = `<p class="empty">${t("search.empty")}</p>`;
      return;
    }
    results.forEach((conf) => wrap.appendChild(conferenceInfoCard(conf)));
  }

  function conferenceInfoCard(conf) {
    const meta = FIELD_META[conf.field];
    const label = fieldLabel(conf.field);
    const el = document.createElement("article");
    el.className = "conference-info-card";
    el.style.borderTopColor = meta.hex;
    el.innerHTML = `
      <div class="conference-info-title">
        <h3>${conf.name}</h3>
        <span class="badge badge-field" style="background:${meta.hex}">${label}</span>
        ${ratingBadge(conf)}
      </div>
      <dl>
        <div><dt>${t("card.fullNameLabel")}</dt><dd>${conf.fullName}</dd></div>
        <div><dt>${t("field.label")}</dt><dd>${label}</dd></div>
        <div><dt>${t("card.ratingLabel")}</dt><dd>${conf.rating ? t(conf.rating === "최우수" ? "rating.top" : "rating.good") : t("rating.none")}</dd></div>
      </dl>
      <div class="conference-info-actions">
        <button type="button" class="details-btn">${t("card.detailsBtn")}</button>
        <button type="button" class="web-search-btn">${t("card.webSearchBtn")}</button>
      </div>`;
    el.querySelector(".details-btn").addEventListener("click", () => openModal(conf));
    el.querySelector(".web-search-btn").addEventListener("click", () => openWebSearch(conf));
    return el;
  }

  function openWebSearch(conf) {
    const query = encodeURIComponent(`${conf.name} ${conf.fullName} conference deadline`);
    const popup = window.open(
      `https://www.google.com/search?q=${query}`,
      `conference-search-${conf.id}`,
      "popup=yes,width=960,height=760,scrollbars=yes,resizable=yes"
    );
    if (popup) {
      popup.opener = null;
      popup.focus();
    }
  }

  function renderCalendar() {
    const monthLabel = t("month." + (state.month + 1));
    $("#cal-title").textContent = t("cal.title", { year: state.year, monthLabel });
    const grid = $("#cal-grid");
    grid.innerHTML = "";

    const events = filteredEvents();
    const byDate = {};
    events.forEach((ev) => {
      (byDate[ev.dl.date] = byDate[ev.dl.date] || []).push(ev);
    });

    const first = new Date(state.year, state.month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const t0 = today0();

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (d.getMonth() !== state.month) cell.classList.add("out");
      if (d.getTime() === t0.getTime()) cell.classList.add("today");

      const num = document.createElement("div");
      num.className = "day-num" + (d.getDay() === 0 ? " sun" : "");
      num.textContent = d.getDate();
      cell.appendChild(num);

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayEvents = byDate[key] || [];
      const MAX = 3;
      dayEvents.slice(0, MAX).forEach((ev) => cell.appendChild(pill(ev)));
      if (dayEvents.length > MAX) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "more-count";
        more.textContent = t("cal.moreCount", { n: dayEvents.length - MAX });
        more.addEventListener("click", () => openModal(dayEvents[MAX].conf));
        cell.appendChild(more);
      }
      grid.appendChild(cell);
    }

    if (events.length === 0) $("#empty-msg").hidden = false;
  }

  function pill(ev) {
    const meta = FIELD_META[ev.conf.field];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "event-pill" + (ev.dl.status === "estimated" ? " estimated" : "");
    b.style.background = meta.hex;
    b.title = `${ev.conf.name} · ${ev.dl.label}`;
    b.textContent = `${ev.conf.name} ${shortLabel(ev.dl)}`;
    b.addEventListener("click", () => openModal(ev.conf));
    return b;
  }

  function shortLabel(dl) {
    if (dl.type === "abstract") return t("type.abstract");
    if (dl.type === "paper") return t("type.paper");
    return t("type.other");
  }

  function renderList() {
    const events = filteredEvents();
    const upcoming = events.filter((ev) => ddayOf(ev.date) >= 0);
    const past = events.filter((ev) => ddayOf(ev.date) < 0).reverse();

    const upWrap = $("#upcoming-list");
    const pastWrap = $("#past-list");
    const unknownWrap = $("#unknown-list");
    upWrap.innerHTML = "";
    pastWrap.innerHTML = "";
    unknownWrap.innerHTML = "";

    // 마감일 데이터가 없는 학회 (필터 적용)
    const unknown = (state.data.conferences || []).filter((conf) => {
      if (conf.deadlines.length > 0) return false;
      if (state.field !== "all" && conf.field !== state.field) return false;
      if (!matchesSearch(conf)) return false;
      return state.status === "all";
    });
    unknown.forEach((conf) => unknownWrap.appendChild(unknownCard(conf)));
    $("#unknown-details").hidden = unknown.length === 0;

    if (upcoming.length === 0 && past.length === 0 && unknown.length === 0) {
      $("#empty-msg").hidden = false;
      return;
    }
    if (upcoming.length === 0) {
      upWrap.innerHTML = `<p class="empty">${t("list.upcomingEmpty")}</p>`;
    }

    upcoming.forEach((ev) => upWrap.appendChild(card(ev, false)));
    past.forEach((ev) => pastWrap.appendChild(card(ev, true)));
  }

  // ── 목록(게시판) ─────────────────────────
  const GRADE_LETTER = { "최우수": "S", "우수": "A" };
  const SUBFIELD_CODE = {
    sys: "OS/Arch", ai: "ML", data: "DM", net: "Net", sec: "Sec", plse: "PL/SE",
    hci: "HCI", theory: "Theory", hw: "HW", arvr: "AR/VR", health: "Bio", etc: "Etc",
  };

  function abbrOf(conf) {
    return conf.name.replace(/\s+\d{4}$/, "");
  }

  // 학회 id → 게시판 번호(등급별 일련번호). 필터와 무관하게 번호가 고정되도록 전체 목록 기준으로 1회 생성
  let boardIndex = null;
  function buildBoardIndex() {
    const year = new Date().getFullYear();
    const order = { "최우수": 0, "우수": 1 };
    const confs = [...(state.data.conferences || [])];
    confs.sort((a, b) => {
      const ga = order[a.rating] ?? 2;
      const gb = order[b.rating] ?? 2;
      if (ga !== gb) return ga - gb;
      return abbrOf(a).localeCompare(abbrOf(b));
    });
    const counters = {};
    boardIndex = new Map();
    confs.forEach((conf, i) => {
      const letter = GRADE_LETTER[conf.rating] || "B";
      counters[letter] = (counters[letter] || 0) + 1;
      boardIndex.set(conf.id, {
        no: `${year}-${letter}-${String(counters[letter]).padStart(3, "0")}`,
        letter,
        rank: i, // 등급(최우수→우수→기타) → 약칭 순 정렬 위치
      });
    });
  }

  function renderBoard() {
    if (!boardIndex) buildBoardIndex();
    const confs = (state.data.conferences || []).filter((conf) => {
      if (state.field !== "all" && conf.field !== state.field) return false;
      if (!matchesSearch(conf)) return false;
      if (state.status !== "all" && !conf.deadlines.some((dl) => dl.status === state.status)) return false;
      return true;
    });
    confs.sort((a, b) => boardIndex.get(a.id).rank - boardIndex.get(b.id).rank);

    $("#board-heading").textContent = t("board.heading.count", { n: confs.length });

    const totalPages = Math.max(1, Math.ceil(confs.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * state.pageSize;
    const pageConfs = confs.slice(start, start + state.pageSize);

    const body = $("#board-body");
    body.innerHTML = "";
    if (confs.length === 0) {
      body.innerHTML = `<tr><td colspan="7"><p class="empty">${t("board.empty")}</p></td></tr>`;
    }
    pageConfs.forEach((conf) => {
      const idx = boardIndex.get(conf.id);
      const isAI = conf.field === "ai";
      const noteKey = conf.deadlines.length === 0
        ? "board.note.noDeadline"
        : (conf.deadlines.some((dl) => dl.status === "estimated") ? "board.note.estimated" : null);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="board-no">${idx.no}</td>
        <td><span class="badge-cat ${isAI ? "cat-ai" : "cat-cs"}">${isAI ? "AI" : "CS"}</span></td>
        <td class="board-sub">${SUBFIELD_CODE[conf.field] || "Etc"}</td>
        <td class="board-abbr">${abbrOf(conf)}</td>
        <td class="board-name"><a href="${conf.url}" target="_blank" rel="noopener">${conf.fullName} <span aria-hidden="true">↗</span></a></td>
        <td><span class="grade-badge grade-${idx.letter.toLowerCase()}" title="${conf.rating || ""}">${idx.letter}</span></td>
        <td class="board-note">${noteKey ? t(noteKey) : ""}</td>`;
      tr.addEventListener("click", (e) => {
        if (!e.target.closest("a")) openModal(conf);
      });
      body.appendChild(tr);
    });

    renderBoardPager(totalPages);
  }

  function boardPageNumbers(total, current) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    const lo = Math.max(2, current - 1);
    const hi = Math.min(total - 1, current + 1);
    if (lo > 2) pages.push("…");
    for (let p = lo; p <= hi; p++) pages.push(p);
    if (hi < total - 1) pages.push("…");
    pages.push(total);
    return pages;
  }

  function renderBoardPager(totalPages) {
    const nav = $("#board-pager");
    nav.innerHTML = "";
    if (totalPages <= 1) return;

    const addBtn = (label, page, opts = {}) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (opts.aria) b.setAttribute("aria-label", opts.aria);
      if (opts.active) {
        b.classList.add("active");
        b.setAttribute("aria-current", "page");
      }
      if (opts.disabled) b.disabled = true;
      else b.addEventListener("click", () => { state.page = page; renderBoard(); });
      nav.appendChild(b);
    };

    addBtn("‹", state.page - 1, { disabled: state.page === 1, aria: t("board.prev") });
    boardPageNumbers(totalPages, state.page).forEach((p) => {
      if (p === "…") {
        const s = document.createElement("span");
        s.className = "ellipsis";
        s.textContent = "…";
        nav.appendChild(s);
      } else {
        addBtn(String(p), p, { active: p === state.page });
      }
    });
    addBtn("›", state.page + 1, { disabled: state.page === totalPages, aria: t("board.next") });
  }

  function unknownCard(conf) {
    const meta = FIELD_META[conf.field];
    const label = fieldLabel(conf.field);
    const el = document.createElement("div");
    el.className = "deadline-card";
    el.style.borderLeftColor = meta.hex;
    el.innerHTML = `
      <div class="dday"><span class="date-sub">${t("list.unknown")}</span></div>
      <div class="deadline-info">
        <div class="conf-name">${conf.name}
          <span class="badge badge-field" style="background:${meta.hex}">${label}</span>
          ${ratingBadge(conf)}
        </div>
        <div class="deadline-label">${conf.fullName}</div>
      </div>`;
    el.addEventListener("click", () => openModal(conf));
    return el;
  }

  function card(ev, isPast) {
    const meta = FIELD_META[ev.conf.field];
    const label = fieldLabel(ev.conf.field);
    const dday = ddayOf(ev.date);
    const el = document.createElement("div");
    el.className = "deadline-card" + (isPast ? " past" : "");
    el.style.borderLeftColor = meta.hex;

    const ddayText = dday === 0 ? "D-Day" : dday > 0 ? `D-${dday}` : `D+${-dday}`;
    const urgent = dday >= 0 && dday <= 14;

    el.innerHTML = `
      <div class="dday${urgent ? " urgent" : ""}">${ddayText}
        <span class="date-sub">${fmtDate(ev.date)}</span>
      </div>
      <div class="deadline-info">
        <div class="conf-name">${ev.conf.name}
          <span class="badge badge-field" style="background:${meta.hex}">${label}</span>
          ${ratingBadge(ev.conf)}
          ${statusBadge(ev.dl.status)}
        </div>
        <div class="deadline-label">${ev.dl.label}</div>
        <div class="conf-meta">📍 ${ev.conf.location} · 🗓️ ${confPeriod(ev.conf)}</div>
      </div>`;
    el.addEventListener("click", () => openModal(ev.conf));
    return el;
  }

  function statusBadge(status) {
    return status === "estimated"
      ? `<span class="badge badge-estimated">${t("status.estimated")}</span>`
      : `<span class="badge badge-confirmed">${t("status.confirmed")}</span>`;
  }

  function ratingBadge(conf) {
    if (!conf.rating) return "";
    const isTop = conf.rating === "최우수";
    const cls = isTop ? "badge-rating-top" : "badge-rating-good";
    return `<span class="badge ${cls}">🏆 ${t(isTop ? "rating.top" : "rating.good")}</span>`;
  }

  function confPeriod(conf) {
    if (conf.confStart && conf.confEnd) {
      return `${fmtDate(parseDate(conf.confStart))} ~ ${fmtDate(parseDate(conf.confEnd))}`;
    }
    return conf.confText || t("confPeriod.tbd");
  }

  // ── 대시보드 ─────────────────────────────
  const RATING_TOP = "최우수";

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmtNum(n) {
    return Number(n).toLocaleString(window.I18N_LANG === "en" ? "en-US" : "ko-KR");
  }

  // 눈금 계산: max 값을 4개 내외의 깔끔한 눈금으로
  function niceScale(max) {
    if (max <= 0) return { max: 1, step: 1 };
    const raw = max / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const mult = [1, 2, 2.5, 5, 10].find((m) => m * pow >= raw);
    const step = mult * pow;
    return { max: Math.ceil(max / step) * step, step };
  }

  // 강제 다크 브라우저가 background-color를 재변환하지 못하도록 gradient로 칠한다
  function paintFixed(node, color) {
    node.style.backgroundColor = color;
    node.style.backgroundImage = `linear-gradient(${color}, ${color})`;
  }

  // ── 대시보드: 툴팁 ──
  let tipEl = null;
  function tipNode() {
    if (!tipEl) {
      tipEl = el("div", "dash-tooltip");
      tipEl.hidden = true;
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function showTip(lines, x, y) {
    const t = tipNode();
    t.innerHTML = "";
    lines.forEach((line) => {
      const row = el("div", "tip-row");
      if (line.swatch) {
        const sw = el("span", "tip-swatch");
        paintFixed(sw, line.swatch);
        row.appendChild(sw);
      }
      if (line.value !== undefined) row.appendChild(el("strong", "tip-value", line.value));
      row.appendChild(el("span", "tip-label", line.label));
      t.appendChild(row);
    });
    t.hidden = false;
    const pad = 12;
    const rect = t.getBoundingClientRect();
    let left = x + pad, top = y + pad;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
    t.style.left = Math.max(8, left) + "px";
    t.style.top = Math.max(8, top) + "px";
  }

  function hideTip() {
    if (tipEl) tipEl.hidden = true;
  }

  function attachTip(mark, linesFn) {
    mark.addEventListener("pointermove", (e) => showTip(linesFn(), e.clientX, e.clientY));
    mark.addEventListener("pointerleave", hideTip);
    mark.addEventListener("focus", () => {
      const r = mark.getBoundingClientRect();
      showTip(linesFn(), r.left + r.width / 2, r.top - 8);
    });
    mark.addEventListener("blur", hideTip);
  }

  // ── 대시보드: 집계 ──
  function domainCounts() {
    const rows = {};
    (state.data.conferences || []).forEach((conf) => {
      const r = (rows[conf.field] = rows[conf.field] || { top: 0, good: 0 });
      if (conf.rating === RATING_TOP) r.top += 1;
      else r.good += 1;
    });
    return Object.entries(rows)
      .map(([field, r]) => ({ field, ...r, total: r.top + r.good }))
      .sort((a, b) => b.total - a.total);
  }

  function monthKeys12() {
    const t = today0();
    const out = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
    return out;
  }

  function monthStats() {
    const byMonth = {};
    state.events.forEach((ev) => {
      const key = ev.dl.date.slice(0, 7);
      const m = (byMonth[key] = byMonth[key] || { events: [], confirmed: 0, estimated: 0, abstract: 0, paper: 0, other: 0, confs: new Set() });
      m.events.push(ev);
      m[ev.dl.status === "estimated" ? "estimated" : "confirmed"] += 1;
      m[ev.dl.type === "abstract" ? "abstract" : ev.dl.type === "paper" ? "paper" : "other"] += 1;
      m.confs.add(ev.conf.id);
    });
    return monthKeys12().map((mk) => {
      const m = byMonth[mk.key] || { events: [], confirmed: 0, estimated: 0, abstract: 0, paper: 0, other: 0, confs: new Set() };
      return { ...mk, count: m.events.length, confirmed: m.confirmed, estimated: m.estimated,
               abstract: m.abstract, paper: m.paper, other: m.other,
               confCount: m.confs.size, events: m.events };
    });
  }

  function renderDashboard() {
    renderDashTiles();
    renderDomainChart();
    renderMonthChart();
    renderPaperPanel();
  }

  // ── 대시보드: 요약 타일 ──
  function renderDashTiles() {
    const confs = state.data.conferences || [];
    const top = confs.filter((c) => c.rating === RATING_TOP).length;
    const fields = new Set(confs.map((c) => c.field)).size;
    const nowKey = monthKeys12()[0];
    const thisMonth = monthStats()[0];
    const nowMonthLabel = t("month." + nowKey.month);

    const tiles = [
      { label: t("dash.tile.total"), value: fmtNum(confs.length), sub: t("dash.tile.fieldsCount", { n: fields }) },
      { label: t("dash.tile.top"), value: fmtNum(top), sub: t("dash.tile.pctOfTotal", { pct: Math.round((top / confs.length) * 100) }) },
      { label: t("dash.tile.good"), value: fmtNum(confs.length - top), sub: t("dash.tile.pctOfTotal", { pct: Math.round(((confs.length - top) / confs.length) * 100) }) },
      { label: t("dash.tile.thisMonth", { monthLabel: nowMonthLabel }), value: t("unit.cases", { n: fmtNum(thisMonth.count) }), sub: t("dash.tile.confirmedEstimated", { c: thisMonth.confirmed, e: thisMonth.estimated }) },
    ];

    const wrap = $("#dash-tiles");
    wrap.innerHTML = "";
    tiles.forEach((t) => {
      const tile = el("div", "dash-tile");
      tile.appendChild(el("div", "tile-label", t.label));
      tile.appendChild(el("div", "tile-value", t.value));
      tile.appendChild(el("div", "tile-sub", t.sub));
      wrap.appendChild(tile);
    });
  }

  // ── 대시보드: 카테고리별 등급 현황 ──
  function renderDomainChart() {
    const rows = domainCounts();
    const max = Math.max(...rows.map((r) => r.total), 1);
    const wrap = $("#domain-chart");
    wrap.innerHTML = "";

    rows.forEach((r) => {
      const meta = FIELD_META[r.field] || FIELD_META.etc;
      const label = fieldLabel(r.field);
      const row = el("div", "domain-row");

      const labelEl = el("span", "domain-label");
      const dot = el("span", "dot");
      paintFixed(dot, meta.hex);
      labelEl.appendChild(dot);
      labelEl.appendChild(document.createTextNode(label));
      row.appendChild(labelEl);

      const track = el("div", "domain-track");
      const bar = el("div", "domain-bar");
      bar.style.width = (r.total / max) * 100 + "%";
      bar.tabIndex = 0;
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", t("dash.domain.ariaBar", { field: label, top: r.top, good: r.good, total: r.total }));
      if (r.top > 0) {
        const seg = el("div", "seg seg-top");
        seg.style.flexGrow = r.top;
        seg.dataset.count = r.top;
        bar.appendChild(seg);
      }
      if (r.good > 0) {
        const seg = el("div", "seg seg-good");
        seg.style.flexGrow = r.good;
        seg.dataset.count = r.good;
        bar.appendChild(seg);
      }
      attachTip(bar, () => [
        { label },
        { value: t("unit.count", { n: r.top }), label: t("rating.top"), swatch: cssVar("--tier-top") },
        { value: t("unit.count", { n: r.good }), label: t("rating.good"), swatch: cssVar("--tier-good") },
        { value: t("unit.count", { n: r.total }), label: t("dash.total") },
      ]);
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el("span", "domain-total", fmtNum(r.total)));
      wrap.appendChild(row);
    });

    // 세그먼트 안에 들어갈 폭이 될 때만 직접 라벨을 단다
    requestAnimationFrame(() => {
      wrap.querySelectorAll(".seg").forEach((seg) => {
        if (seg.querySelector(".seg-label")) return;
        if (seg.clientWidth >= 26) seg.appendChild(el("span", "seg-label", seg.dataset.count));
      });
    });

    // 표 뷰
    const table = $("#domain-table");
    table.innerHTML = "";
    table.appendChild(tableRow([t("field.label"), t("rating.top"), t("rating.good"), t("dash.total")], "th"));
    rows.forEach((r) => {
      const label = fieldLabel(r.field);
      table.appendChild(tableRow([label, r.top, r.good, r.total]));
    });
    const sum = rows.reduce((a, r) => ({ top: a.top + r.top, good: a.good + r.good, total: a.total + r.total }),
                            { top: 0, good: 0, total: 0 });
    table.appendChild(tableRow([t("common.all"), sum.top, sum.good, sum.total], "th"));
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function tableRow(cells, cellTag) {
    const tr = document.createElement("tr");
    cells.forEach((c, i) => {
      const td = document.createElement(cellTag === "th" ? "th" : i === 0 ? "th" : "td");
      td.textContent = typeof c === "number" ? fmtNum(c) : c;
      tr.appendChild(td);
    });
    return tr;
  }

  // ── 대시보드: 컬럼 차트 공통 ──
  function columnChart(container, items, opts) {
    const scale = niceScale(Math.max(...items.map((i) => i.value), 1));
    container.innerHTML = "";

    const plot = el("div", "cc-plot");
    for (let v = 0; v <= scale.max; v += scale.step) {
      const line = el("div", "cc-gridline");
      line.style.bottom = (v / scale.max) * 100 + "%";
      if (v === 0) line.classList.add("baseline");
      plot.appendChild(line);
      const tick = el("span", "cc-tick", fmtNum(v));
      tick.style.bottom = (v / scale.max) * 100 + "%";
      plot.appendChild(tick);
    }

    const cols = el("div", "cc-cols");
    const maxVal = Math.max(...items.map((i) => i.value));
    items.forEach((item) => {
      const slot = el("div", "cc-slot");
      if (item.capLabel || (opts.labelMax && item.value === maxVal && item.value > 0)) {
        slot.appendChild(el("span", "cc-cap", fmtNum(item.value)));
      }
      const col = el("button", "cc-col");
      col.type = "button";
      col.style.height = Math.max((item.value / scale.max) * 100, item.value > 0 ? 1 : 0) + "%";
      if (item.value === 0) col.classList.add("zero");
      if (item.selected) col.classList.add("selected");
      col.setAttribute("aria-label", item.aria);
      col.setAttribute("aria-pressed", item.selected ? "true" : "false");
      if (item.onClick) col.addEventListener("click", item.onClick);
      attachTip(col, item.tipLines);
      if (item.segments && item.value > 0) {
        col.classList.add("stacked");
        item.segments.forEach((seg) => {
          if (!seg.value) return;
          const segEl = el("div", "cc-seg " + (seg.cls || ""));
          segEl.style.flexGrow = seg.value;
          col.appendChild(segEl);
        });
      }
      slot.appendChild(col);
      cols.appendChild(slot);
    });
    plot.appendChild(cols);
    container.appendChild(plot);

    const xlabels = el("div", "cc-xlabels");
    if (items.length > 8) xlabels.classList.add("dense");
    items.forEach((item) => {
      const lab = el("span", "cc-xlabel");
      lab.appendChild(el("span", undefined, item.label));
      if (item.sub) lab.appendChild(el("span", "cc-xsub", item.sub));
      xlabels.appendChild(lab);
    });
    container.appendChild(xlabels);
  }

  // ── 대시보드: 월별 학회 현황 ──
  function renderMonthChart() {
    const stats = monthStats();
    if (!state.dashMonth || !stats.some((s) => s.key === state.dashMonth)) {
      state.dashMonth = stats[0].key;
    }

    columnChart($("#month-chart"), stats.map((s, i) => {
      const monthLabel = t("month." + s.month);
      return {
        label: monthLabel,
        sub: i === 0 || s.month === 1 ? String(s.year) : undefined,
        value: s.count,
        selected: s.key === state.dashMonth,
        aria: t("dash.month.aria", { year: s.year, monthLabel, paper: s.paper, abstract: s.abstract, confCount: s.confCount }),
        onClick: () => {
          state.dashMonth = s.key;
          renderMonthChart();
        },
        segments: [
          { value: s.paper, cls: "cc-seg-paper" },
          { value: s.abstract, cls: "cc-seg-abstract" },
          { value: s.other, cls: "cc-seg-other" },
        ],
        tipLines: () => [
          { label: t("cal.title", { year: s.year, monthLabel }) },
          { value: t("unit.cases", { n: s.paper }), label: t("dash.month.legend.paper"), swatch: cssVar("--accent") },
          { value: t("unit.cases", { n: s.abstract }), label: t("dash.month.legend.abstract"), swatch: cssVar("--accent-2") },
          { value: t("unit.venues", { n: s.confCount }), label: t("dash.confCount") },
          { value: `${s.confirmed} · ${s.estimated}`, label: t("dash.month.tip.confirmedEstimated") },
        ],
      };
    }), { labelMax: true });

    // 선택한 월의 상세 목록
    const sel = stats.find((s) => s.key === state.dashMonth);
    const selMonthLabel = t("month." + sel.month);
    $("#month-detail-heading").textContent = t("dash.month.detailHeading", { year: sel.year, monthLabel: selMonthLabel, count: sel.count });
    const detail = $("#month-detail");
    detail.innerHTML = "";
    if (sel.count === 0) {
      detail.appendChild(el("p", "empty", t("dash.month.detailEmpty")));
    }
    sel.events
      .slice()
      .sort((a, b) => a.date - b.date)
      .forEach((ev) => {
        const meta = FIELD_META[ev.conf.field] || FIELD_META.etc;
        const item = el("button", "month-item");
        item.type = "button";
        const date = el("span", "mi-date", `${String(ev.date.getMonth() + 1).padStart(2, "0")}.${String(ev.date.getDate()).padStart(2, "0")}`);
        const name = el("span", "mi-name");
        const dot = el("span", "dot");
        paintFixed(dot, meta.hex);
        name.appendChild(dot);
        name.appendChild(document.createTextNode(ev.conf.name));
        const label = el("span", "mi-label", ev.dl.label);
        const badge = el("span", "badge " + (ev.dl.status === "estimated" ? "badge-estimated" : "badge-confirmed"),
                         t(ev.dl.status === "estimated" ? "status.estimated" : "status.confirmed"));
        item.append(date, name, label, badge);
        item.addEventListener("click", () => openModal(ev.conf));
        detail.appendChild(item);
      });

    // 표 뷰
    const table = $("#month-table");
    table.innerHTML = "";
    table.appendChild(tableRow([t("dash.month.table.month"), t("dash.month.table.count"), t("type.paper"), t("type.abstract"), t("table.confirmed"), t("table.estimated"), t("dash.confCount")], "th"));
    stats.forEach((s) => table.appendChild(tableRow([`${s.year}.${String(s.month).padStart(2, "0")}`, s.count, s.paper, s.abstract, s.confirmed, s.estimated, s.confCount])));
  }

  // ── 대시보드: 매년 학회별 등재 논문 수 ──
  function renderPaperPanel() {
    const card = $("#papers-card");
    const select = $("#paper-conf-select");
    const chart = $("#paper-chart");
    const note = $("#paper-note");
    const venues = (state.paperStats && state.paperStats.venues) || [];

    if (venues.length === 0) {
      select.hidden = true;
      chart.innerHTML = "";
      chart.appendChild(el("p", "empty", t("dash.papers.empty")));
      note.textContent = "";
      card.querySelectorAll(".dash-table-details").forEach((d) => (d.hidden = true));
      $("#paper-country-detail-heading").textContent = "";
      $("#paper-country-detail").innerHTML = "";
      return;
    }

    select.hidden = false;
    card.querySelectorAll(".dash-table-details").forEach((d) => (d.hidden = false));
    if (!select.dataset.bound) {
      select.dataset.bound = "1";
      select.addEventListener("change", () => {
        state.paperConf = select.value;
        renderPaperPanel();
      });
    }
    if (!state.paperConf || !venues.some((v) => v.id === state.paperConf)) {
      state.paperConf = venues.some((v) => v.id === "neurips") ? "neurips" : venues[0].id;
    }
    select.innerHTML = "";
    venues.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.label;
      opt.selected = v.id === state.paperConf;
      select.appendChild(opt);
    });

    const venue = venues.find((v) => v.id === state.paperConf);
    const years = Object.keys(venue.years).sort();
    const approxMark = venue.approx ? t("dash.papers.approx") : "";

    if (!state.paperYear || !years.includes(state.paperYear)) {
      state.paperYear = years[years.length - 1];
    }

    columnChart(chart, years.map((y, i) => {
      const valueText = t("papers.valueWithUnit", { approx: approxMark, n: fmtNum(venue.years[y]) });
      return {
        label: y,
        value: venue.years[y],
        capLabel: i === years.length - 1, // 최신 연도만 직접 라벨
        selected: y === state.paperYear,
        aria: t("dash.papers.aria", { label: venue.label, year: y, valueText }),
        onClick: () => {
          state.paperYear = y;
          renderPaperPanel();
        },
        tipLines: () => [
          { label: t("dash.papers.tip.title", { label: venue.label, year: y }) },
          { value: valueText, label: t("dash.papers.tip.accepted") },
        ],
      };
    }), { labelMax: false });

    // 표 뷰
    const table = $("#paper-table");
    table.innerHTML = "";
    table.appendChild(tableRow([t("dash.papers.table.year"), t("dash.papers.table.count")], "th"));
    years.forEach((y) => table.appendChild(tableRow([y, venue.years[y]])));

    note.textContent = state.paperStats.note || "";

    renderPaperCountryDetail(venue, state.paperYear);
  }

  // ── 대시보드: 매년 학회별 제1저자 국가 분포 ──
  function renderPaperCountryDetail(venue, year) {
    $("#paper-country-detail-heading").textContent = t("dash.papers.countries.detailHeading", { label: venue.label, year });
    const detail = $("#paper-country-detail");
    const tableDetails = $("#paper-country-table-details");
    const table = $("#paper-country-table");
    const note = $("#paper-country-note");
    detail.innerHTML = "";

    const venueCountries = state.paperCountries && state.paperCountries.venues.find((v) => v.id === venue.id);
    const yearData = venueCountries && venueCountries.years[year];
    const countries = yearData && yearData.countries;

    if (!countries || countries.length === 0) {
      detail.appendChild(el("p", "empty", t("dash.papers.countries.empty", { label: venue.label, year })));
      tableDetails.hidden = true;
      note.textContent = "";
      return;
    }

    tableDetails.hidden = false;
    const max = Math.max(...countries.map((c) => c.count), 1);
    const chartWrap = el("div", "country-chart");
    countries.forEach((c) => {
      const name = c.code === "other" ? t("dash.papers.countries.other") : `${c.country} (${c.code})`;
      const pct = Math.round((c.count / yearData.total) * 100);
      const row = el("div", "country-row");
      row.appendChild(el("span", "country-label", name));
      const track = el("div", "country-track");
      const bar = el("div", "country-bar");
      bar.style.width = (c.count / max) * 100 + "%";
      bar.tabIndex = 0;
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", t("dash.papers.countries.ariaBar", { country: name, count: c.count, pct }));
      attachTip(bar, () => [{ value: t("dash.papers.countries.tip.share", { pct, count: c.count }), label: name }]);
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el("span", "country-total", fmtNum(c.count)));
      chartWrap.appendChild(row);
    });
    detail.appendChild(chartWrap);

    table.innerHTML = "";
    table.appendChild(tableRow([t("dash.papers.countries.table.country"), t("dash.papers.countries.table.count")], "th"));
    countries.forEach((c) => {
      const name = c.code === "other" ? t("dash.papers.countries.other") : `${c.country} (${c.code})`;
      table.appendChild(tableRow([name, c.count]));
    });

    note.textContent = yearData.unknown > 0 ? t("dash.papers.countries.unknownNote", { n: yearData.unknown }) : "";
  }

  // ── 모달 ─────────────────────────────────
  function openModal(conf) {
    const meta = FIELD_META[conf.field];
    const label = fieldLabel(conf.field);
    const body = $("#modal-body");

    const rows = conf.deadlines
      .map((dl) => {
        const d = parseDate(dl.date);
        const dday = ddayOf(d);
        const isPast = dday < 0;
        const mini = !isPast && dday <= 30 ? `<span class="mini-dday">${dday === 0 ? "D-Day" : "D-" + dday}</span>` : "";
        return `<li class="${isPast ? "past" : ""}">
          <span>${dl.label} ${statusBadge(dl.status)}</span>
          <span class="dl-date">${fmtDate(d)}${mini}</span>
        </li>`;
      })
      .join("");

    const next = conf.deadlines
      .map((dl) => ({ dl, d: parseDate(dl.date) }))
      .filter((x) => ddayOf(x.d) >= 0)[0];

    let gcalLink = "";
    if (next) {
      const y = next.d.getFullYear(), m = next.d.getMonth(), day = next.d.getDate();
      const s = `${y}${String(m + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
      const e = new Date(y, m, day + 1);
      const eStr = `${e.getFullYear()}${String(e.getMonth() + 1).padStart(2, "0")}${String(e.getDate()).padStart(2, "0")}`;
      const text = encodeURIComponent(`[${conf.name}] ${next.dl.label}`);
      const details = encodeURIComponent(`${conf.fullName}\n${t("modal.gcalDetails")}\n${conf.url}`);
      gcalLink = `<a class="primary" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${s}/${eStr}&details=${details}">${t("modal.addToGCal")}</a>`;
    }

    body.innerHTML = `
      <h3 id="modal-title">${conf.name}
        <span class="badge badge-field" style="background:${meta.hex}">${label}</span>
        ${ratingBadge(conf)}
      </h3>
      <p class="full-name">${conf.fullName}</p>
      <div class="meta-row">📍 <strong>${t("modal.location")}</strong> · ${conf.location}</div>
      <div class="meta-row">🗓️ <strong>${t("modal.dates")}</strong> · ${confPeriod(conf)}</div>
      <div class="meta-row">⏰ <strong>${t("modal.tz")}</strong> · ${conf.tz || t("modal.tzDefault")}</div>
      ${conf.note ? `<div class="meta-row">ℹ️ ${conf.note}</div>` : ""}
      <ul class="modal-deadlines">${rows || `<li><span>${t("modal.noDeadlines")}</span></li>`}</ul>
      <div class="modal-actions">
        ${gcalLink}
        ${conf.url ? `<a target="_blank" rel="noopener" href="${conf.url}">${t("modal.officialSite")}</a>` : ""}
      </div>`;

    $("#modal").hidden = false;
  }

  function closeModal() {
    $("#modal").hidden = true;
  }
})();
