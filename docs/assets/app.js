/* AI 학회 마감일 캘린더 */
(function () {
  "use strict";

  const FIELD_META = {
    sys: { label: "시스템/아키텍처", hex: "#1971c2" },
    ai: { label: "인공지능", hex: "#9c36b5" },
    data: { label: "데이터/웹", hex: "#0ca678" },
    net: { label: "네트워크/통신", hex: "#2f9e44" },
    sec: { label: "보안", hex: "#e03131" },
    plse: { label: "PL/SE", hex: "#e8590c" },
    hci: { label: "HCI/그래픽스", hex: "#e64980" },
    theory: { label: "알고리즘/이론", hex: "#5f3dc4" },
    hw: { label: "HW/로보틱스", hex: "#f08c00" },
    arvr: { label: "AR/VR", hex: "#0b7285" },
    health: { label: "헬스/바이오", hex: "#74b816" },
    etc: { label: "기타", hex: "#868e96" },
  };

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  const state = {
    view: "calendar",
    field: "all",
    status: "all",
    query: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-based
    data: null,
    events: [], // { conf, dl, date(Date) }
    paperStats: null,
    dashMonth: null, // 월별 현황에서 선택한 "YYYY-MM"
    paperConf: null, // 논문 수 패널에서 선택한 학회 id
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
  ])
    .then(([data, paperStats]) => {
      state.data = data;
      state.paperStats = paperStats;
      state.events = flatten(data.conferences);
      $("#updated-at").textContent = "업데이트: " + data.updated;
      buildFieldChips();
      bindControls();
      const hashView = viewFromHash();
      if (hashView) setView(hashView, false);
      else render();
    })
    .catch((err) => {
      $("#empty-msg").hidden = false;
      $("#empty-msg").textContent = "데이터를 불러오지 못했습니다: " + err.message;
    });

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
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${WEEKDAYS[date.getDay()]})`;
  }

  // ── 필터 ─────────────────────────────────
  function buildFieldChips() {
    const wrap = $("#field-filter");
    const all = document.createElement("button");
    all.type = "button";
    all.className = "chip active";
    all.dataset.field = "all";
    all.textContent = "전체";
    wrap.appendChild(all);
    Object.entries(FIELD_META).forEach(([key, meta]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.field = key;
      b.innerHTML = `<span class="dot" style="background:${meta.hex}"></span>${meta.label}`;
      wrap.appendChild(b);
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
      clearSearch.hidden = search.value.length === 0;
      render();
    });
    clearSearch.addEventListener("click", () => {
      search.value = "";
      state.query = "";
      clearSearch.hidden = true;
      search.focus();
      render();
    });

    $("#field-filter").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.field = btn.dataset.field;
      setActive("#field-filter .chip", btn);
      render();
    });

    $("#status-filter").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.status = btn.dataset.status;
      setActive("#status-filter .chip", btn);
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

    // 요일 헤더
    const wd = $("#cal-weekdays");
    WEEKDAYS.forEach((d, i) => {
      const s = document.createElement("span");
      s.textContent = d;
      if (i === 0) s.className = "sun";
      wd.appendChild(s);
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
    $("#empty-msg").hidden = true;
    if (isDash) {
      renderDashboard();
      return;
    }
    if (isSearch) {
      renderSearchResults();
      return;
    }
    if (isCal) renderCalendar();
    else renderList();
  }

  function renderSearchResults() {
    const results = (state.data.conferences || []).filter((conf) => {
      if (state.field !== "all" && conf.field !== state.field) return false;
      return matchesSearch(conf);
    });
    const wrap = $("#search-results");
    wrap.innerHTML = "";
    $("#search-heading").textContent = `학회 검색 결과 (${results.length}개)`;

    if (results.length === 0) {
      wrap.innerHTML = '<p class="empty">일치하는 학회 정보가 없습니다.</p>';
      return;
    }
    results.forEach((conf) => wrap.appendChild(conferenceInfoCard(conf)));
  }

  function conferenceInfoCard(conf) {
    const meta = FIELD_META[conf.field];
    const el = document.createElement("article");
    el.className = "conference-info-card";
    el.style.borderTopColor = meta.hex;
    el.innerHTML = `
      <div class="conference-info-title">
        <h3>${conf.name}</h3>
        <span class="badge badge-field" style="background:${meta.hex}">${meta.label}</span>
        ${ratingBadge(conf)}
      </div>
      <dl>
        <div><dt>학회명</dt><dd>${conf.fullName}</dd></div>
        <div><dt>분야</dt><dd>${meta.label}</dd></div>
        <div><dt>등급</dt><dd>${conf.rating || "미지정"}</dd></div>
      </dl>
      <div class="conference-info-actions">
        <button type="button" class="details-btn">마감일 및 개최 정보 보기</button>
        <button type="button" class="web-search-btn">🌐 인터넷에서 검색</button>
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
    $("#cal-title").textContent = `${state.year}년 ${state.month + 1}월`;
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
        more.textContent = `+${dayEvents.length - MAX}개 더보기`;
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
    if (dl.type === "abstract") return "초록";
    if (dl.type === "paper") return "논문";
    return "기타";
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
      upWrap.innerHTML = '<p class="empty">다가오는 마감이 없습니다.</p>';
    }

    upcoming.forEach((ev) => upWrap.appendChild(card(ev, false)));
    past.forEach((ev) => pastWrap.appendChild(card(ev, true)));
  }

  function unknownCard(conf) {
    const meta = FIELD_META[conf.field];
    const el = document.createElement("div");
    el.className = "deadline-card";
    el.style.borderLeftColor = meta.hex;
    el.innerHTML = `
      <div class="dday"><span class="date-sub">미확인</span></div>
      <div class="deadline-info">
        <div class="conf-name">${conf.name}
          <span class="badge badge-field" style="background:${meta.hex}">${meta.label}</span>
          ${ratingBadge(conf)}
        </div>
        <div class="deadline-label">${conf.fullName}</div>
      </div>`;
    el.addEventListener("click", () => openModal(conf));
    return el;
  }

  function card(ev, isPast) {
    const meta = FIELD_META[ev.conf.field];
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
          <span class="badge badge-field" style="background:${meta.hex}">${meta.label}</span>
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
      ? '<span class="badge badge-estimated">🔮 예상</span>'
      : '<span class="badge badge-confirmed">✅ 확정</span>';
  }

  function ratingBadge(conf) {
    if (!conf.rating) return "";
    const cls = conf.rating === "최우수" ? "badge-rating-top" : "badge-rating-good";
    return `<span class="badge ${cls}">🏆 ${conf.rating}</span>`;
  }

  function confPeriod(conf) {
    if (conf.confStart && conf.confEnd) {
      return `${fmtDate(parseDate(conf.confStart))} ~ ${fmtDate(parseDate(conf.confEnd))}`;
    }
    return conf.confText || "일정 미정";
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
    return Number(n).toLocaleString("ko-KR");
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
        sw.style.background = line.swatch;
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
      const m = (byMonth[key] = byMonth[key] || { events: [], confirmed: 0, estimated: 0, confs: new Set() });
      m.events.push(ev);
      m[ev.dl.status === "estimated" ? "estimated" : "confirmed"] += 1;
      m.confs.add(ev.conf.id);
    });
    return monthKeys12().map((mk) => {
      const m = byMonth[mk.key] || { events: [], confirmed: 0, estimated: 0, confs: new Set() };
      return { ...mk, count: m.events.length, confirmed: m.confirmed,
               estimated: m.estimated, confCount: m.confs.size, events: m.events };
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

    const tiles = [
      { label: "전체 학회", value: fmtNum(confs.length), sub: `${fields}개 분야` },
      { label: "최우수 학회", value: fmtNum(top), sub: `전체의 ${Math.round((top / confs.length) * 100)}%` },
      { label: "우수 학회", value: fmtNum(confs.length - top), sub: `전체의 ${Math.round(((confs.length - top) / confs.length) * 100)}%` },
      { label: `이번 달 마감 (${nowKey.month}월)`, value: `${fmtNum(thisMonth.count)}건`, sub: `확정 ${thisMonth.confirmed} · 예상 ${thisMonth.estimated}` },
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
      const row = el("div", "domain-row");

      const label = el("span", "domain-label");
      const dot = el("span", "dot");
      dot.style.background = meta.hex;
      label.appendChild(dot);
      label.appendChild(document.createTextNode(meta.label));
      row.appendChild(label);

      const track = el("div", "domain-track");
      const bar = el("div", "domain-bar");
      bar.style.width = (r.total / max) * 100 + "%";
      bar.tabIndex = 0;
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", `${meta.label}: 최우수 ${r.top}개, 우수 ${r.good}개, 합계 ${r.total}개`);
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
        { label: meta.label },
        { value: `${r.top}개`, label: "최우수", swatch: cssVar("--tier-top") },
        { value: `${r.good}개`, label: "우수", swatch: cssVar("--tier-good") },
        { value: `${r.total}개`, label: "합계" },
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
    table.appendChild(tableRow(["분야", "최우수", "우수", "합계"], "th"));
    rows.forEach((r) => {
      const meta = FIELD_META[r.field] || FIELD_META.etc;
      table.appendChild(tableRow([meta.label, r.top, r.good, r.total]));
    });
    const sum = rows.reduce((a, r) => ({ top: a.top + r.top, good: a.good + r.good, total: a.total + r.total }),
                            { top: 0, good: 0, total: 0 });
    table.appendChild(tableRow(["전체", sum.top, sum.good, sum.total], "th"));
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

    columnChart($("#month-chart"), stats.map((s, i) => ({
      label: `${s.month}월`,
      sub: i === 0 || s.month === 1 ? String(s.year) : undefined,
      value: s.count,
      selected: s.key === state.dashMonth,
      aria: `${s.year}년 ${s.month}월: 마감 ${s.count}건 (학회 ${s.confCount}곳)`,
      onClick: () => {
        state.dashMonth = s.key;
        renderMonthChart();
      },
      tipLines: () => [
        { label: `${s.year}년 ${s.month}월` },
        { value: `${s.count}건`, label: "논문·초록 마감" },
        { value: `${s.confCount}곳`, label: "학회 수" },
        { value: `${s.confirmed} · ${s.estimated}`, label: "확정 · 예상" },
      ],
    })), { labelMax: true });

    // 선택한 월의 상세 목록
    const sel = stats.find((s) => s.key === state.dashMonth);
    $("#month-detail-heading").textContent = `${sel.year}년 ${sel.month}월 마감 목록 (${sel.count}건)`;
    const detail = $("#month-detail");
    detail.innerHTML = "";
    if (sel.count === 0) {
      detail.appendChild(el("p", "empty", "이 달에는 등록된 마감이 없습니다."));
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
        dot.style.background = meta.hex;
        name.appendChild(dot);
        name.appendChild(document.createTextNode(ev.conf.name));
        const label = el("span", "mi-label", ev.dl.label);
        const badge = el("span", "badge " + (ev.dl.status === "estimated" ? "badge-estimated" : "badge-confirmed"),
                         ev.dl.status === "estimated" ? "🔮 예상" : "✅ 확정");
        item.append(date, name, label, badge);
        item.addEventListener("click", () => openModal(ev.conf));
        detail.appendChild(item);
      });

    // 표 뷰
    const table = $("#month-table");
    table.innerHTML = "";
    table.appendChild(tableRow(["월", "마감 건수", "확정", "예상", "학회 수"], "th"));
    stats.forEach((s) => table.appendChild(tableRow([`${s.year}.${String(s.month).padStart(2, "0")}`, s.count, s.confirmed, s.estimated, s.confCount])));
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
      chart.appendChild(el("p", "empty",
        "논문 수 데이터가 아직 없습니다. scripts/build_paper_stats.py 를 실행해 docs/data/paper_stats.json 을 생성하세요."));
      note.textContent = "";
      card.querySelector(".dash-table-details").hidden = true;
      return;
    }

    select.hidden = false;
    card.querySelector(".dash-table-details").hidden = false;
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
    const approxMark = venue.approx ? "약 " : "";

    columnChart(chart, years.map((y, i) => ({
      label: y,
      value: venue.years[y],
      capLabel: i === years.length - 1, // 최신 연도만 직접 라벨
      aria: `${venue.label} ${y}년: ${approxMark}${fmtNum(venue.years[y])}편`,
      tipLines: () => [
        { label: `${venue.label} ${y}년` },
        { value: `${approxMark}${fmtNum(venue.years[y])}편`, label: "등재 논문" },
      ],
    })), { labelMax: false });

    // 표 뷰
    const table = $("#paper-table");
    table.innerHTML = "";
    table.appendChild(tableRow(["연도", "논문 수"], "th"));
    years.forEach((y) => table.appendChild(tableRow([y, venue.years[y]])));

    note.textContent = state.paperStats.note || "";
  }

  // ── 모달 ─────────────────────────────────
  function openModal(conf) {
    const meta = FIELD_META[conf.field];
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
      const details = encodeURIComponent(`${conf.fullName}\nAoE(UTC-12) 기준 마감\n${conf.url}`);
      gcalLink = `<a class="primary" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${s}/${eStr}&details=${details}">＋ 구글 캘린더에 추가</a>`;
    }

    body.innerHTML = `
      <h3 id="modal-title">${conf.name}
        <span class="badge badge-field" style="background:${meta.hex}">${meta.label}</span>
        ${ratingBadge(conf)}
      </h3>
      <p class="full-name">${conf.fullName}</p>
      <div class="meta-row">📍 <strong>장소</strong> · ${conf.location}</div>
      <div class="meta-row">🗓️ <strong>개최</strong> · ${confPeriod(conf)}</div>
      <div class="meta-row">⏰ <strong>기준시</strong> · ${conf.tz || "학회 공지 참조"}</div>
      ${conf.note ? `<div class="meta-row">ℹ️ ${conf.note}</div>` : ""}
      <ul class="modal-deadlines">${rows || '<li><span>등록된 마감 일정이 없습니다.</span></li>'}</ul>
      <div class="modal-actions">
        ${gcalLink}
        ${conf.url ? `<a target="_blank" rel="noopener" href="${conf.url}">공식 사이트 ↗</a>` : ""}
      </div>`;

    $("#modal").hidden = false;
  }

  function closeModal() {
    $("#modal").hidden = true;
  }
})();
