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
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-based
    data: null,
    events: [], // { conf, dl, date(Date) }
  };

  const $ = (sel) => document.querySelector(sel);

  // ── 데이터 로딩 ───────────────────────────
  fetch("data/conferences.json")
    .then((r) => r.json())
    .then((data) => {
      state.data = data;
      state.events = flatten(data.conferences);
      $("#updated-at").textContent = "업데이트: " + data.updated;
      buildFieldChips();
      bindControls();
      if (location.hash === "#list") {
        const listBtn = document.querySelector('.view-btn[data-view="list"]');
        if (listBtn) listBtn.click();
      }
      render();
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
      return true;
    });
  }

  // ── 컨트롤 바인딩 ─────────────────────────
  function bindControls() {
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
      btn.addEventListener("click", () => {
        state.view = btn.dataset.view;
        document.querySelectorAll(".view-btn").forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        render();
      });
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
    const isCal = state.view === "calendar";
    $("#calendar-view").hidden = !isCal;
    $("#list-view").hidden = isCal;
    $("#empty-msg").hidden = true;
    if (isCal) renderCalendar();
    else renderList();
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
