const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

const byId = id => document.getElementById(id);

const createNode = html => {
  const wrap = document.createElement("template");
  wrap.innerHTML = html.trim();
  return wrap.content.firstElementChild;
};

const toDateKey = date => date.toISOString().slice(0, 10);

const formatTanggal = date => {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

const fallbackLogo = "/assets/img/default-team.png";

const secureUrl = url => {
  if (!url) return fallbackLogo;
  return String(url).replace(/^http:\/\//i, "https://");
};

const cleanName = value => {
  const name = String(value || "").trim();
  return name || "-";
};

const escapeHTML = value => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const mainLeagues = [
  "UEFA CHAMPIONS LEAGUE",
  "UEFA EUROPA LEAGUE",
  "UEFA EUROPA CONFERENCE LEAGUE",
  "ENGLAND - PREMIER LEAGUE",
  "SPAIN - LA LIGA",
  "ITALY - SERIE A",
  "GERMANY - BUNDESLIGA",
  "FRANCE - LIGUE 1",
  "INDONESIA - LIGA 1"
];

const bigTeams = [
  "Real Madrid",
  "Barcelona",
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Manchester United",
  "Tottenham",
  "Bayern",
  "Dortmund",
  "PSG",
  "Inter",
  "AC Milan",
  "Juventus",
  "Napoli",
  "Persib",
  "Persija",
  "Persebaya",
  "Arema",
  "PSM",
  "Bali United"
];

function leagueRank(title = "") {
  const name = title.toUpperCase().trim();
  const index = mainLeagues.findIndex(league => name.includes(league));
  return index === -1 ? 999 : index;
}

function matchRank(row = {}) {
  const text = String(row.match || "").toLowerCase();

  let point = 0;

  for (const team of bigTeams) {
    if (text.includes(team.toLowerCase())) point += 10;
  }

  if (text.includes("derby")) point += 5;

  return point;
}

function getScore(row) {
  return row.predictedScore || row.scorePrediction || "1 - 0";
}

function renderEmptyState(message = "Belum ada jadwal pertandingan untuk tanggal ini.") {
  return createNode(`
    <section class="panel empty-panel">
      <div class="empty-state">
        <strong>Data belum tersedia</strong>
        <p>${escapeHTML(message)}</p>
      </div>
    </section>
  `);
}

function buildMatchCard(row = {}) {
  const homeName = cleanName(row.homeName);
  const awayName = cleanName(row.awayName);
  const matchText = String(row.match || `${homeName} vs ${awayName}`).toLowerCase();

  return `
    <article class="home-match-card" data-row="${escapeHTML(matchText)}">
      <div class="home-left">
        <div class="match-time">
          ${escapeHTML(row.kickoffWib || row.kickoff || "-")}
        </div>
      </div>

      <div class="home-center">
        <div class="home-team">
          <img
            src="${escapeHTML(secureUrl(row.homeLogo))}"
            alt="${escapeHTML(homeName)}"
            loading="lazy"
            onerror="this.src='${fallbackLogo}'"
          />
          <strong>${escapeHTML(homeName)}</strong>
        </div>

        <div class="home-vs">
          <span>VS</span>
        </div>

        <div class="home-team">
          <img
            src="${escapeHTML(secureUrl(row.awayLogo))}"
            alt="${escapeHTML(awayName)}"
            loading="lazy"
            onerror="this.src='${fallbackLogo}'"
          />
          <strong>${escapeHTML(awayName)}</strong>
        </div>
      </div>

      <div class="home-right">
        <div class="predict-score">
          ${escapeHTML(getScore(row))}
        </div>
        <small>
          ${escapeHTML(row.prediction || row.tip || "-")}
        </small>
      </div>
    </article>
  `;
}

function buildPanel(group = {}) {
  const title = cleanName(group.title);
  const rows = Array.isArray(group.rows) ? [...group.rows] : [];

  rows.sort((a, b) => matchRank(b) - matchRank(a));

  return createNode(`
    <section class="panel" data-title="${escapeHTML(title)}">
      <div class="head">
        ${
          group.flag
            ? `
              <img
                src="${escapeHTML(secureUrl(group.flag))}"
                alt=""
                loading="lazy"
                onerror="this.style.display='none'"
                style="width:18px;height:18px;border-radius:50%;object-fit:cover"
              />
            `
            : ""
        }
        <span>${escapeHTML(title.toUpperCase())}</span>
      </div>

      <div class="home-match-grid">
        ${rows.map(buildMatchCard).join("")}
      </div>
    </section>
  `);
}

function render(data = {}) {
  const root = $("#content");
  if (!root) return;

  root.innerHTML = "";

  const groups = Array.isArray(data.groups) ? [...data.groups] : [];

  if (!groups.length) {
    root.appendChild(renderEmptyState());
    return;
  }

  groups
    .sort((a, b) => leagueRank(a.title) - leagueRank(b.title))
    .forEach(group => root.appendChild(buildPanel(group)));

  const input = byId("q");
  applyFilter(input ? input.value : "");
}

async function fetchFixtures(dateKey) {
  const response = await fetch(`/api/fixtures?date=${encodeURIComponent(dateKey)}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data: HTTP ${response.status}`);
  }

  return response.json();
}

function fallbackData(dateKey) {
  return {
    date: dateKey,
    groups: []
  };
}

async function loadFixtures(date = new Date()) {
  const dateKey = toDateKey(date);
  const dateLine = byId("dateLine");
  const loader = byId("loader");

  if (dateLine) {
    dateLine.textContent = formatTanggal(date);
  }

  loader?.classList.add("show");

  try {
    const data = await fetchFixtures(dateKey);
    render(data);
  } catch (error) {
    console.error(error);
    render(fallbackData(dateKey));
  } finally {
    loader?.classList.remove("show");
  }
}

function applyFilter(value = "") {
  const keyword = String(value).trim().toLowerCase();

  $$(".panel").forEach(panel => {
    const title = String(panel.dataset.title || "").toLowerCase();
    let hasVisibleMatch = false;

    panel.querySelectorAll(".home-match-card").forEach(card => {
      const row = String(card.dataset.row || "").toLowerCase();
      const visible = !keyword || title.includes(keyword) || row.includes(keyword);

      card.hidden = !visible;

      if (visible) hasVisibleMatch = true;
    });

    panel.hidden = !hasVisibleMatch;
  });
}

function initLogoReload() {
  const logoBtn = byId("logoBtn");
  if (!logoBtn) return;

  logoBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      window.location.reload();
    }, 250);
  });
}

function initSlider() {
  const track = byId("track");
  const slider = byId("slider");
  const dots = byId("dots");
  const nextBtn = byId("next");
  const prevBtn = byId("prev");

  if (!track || !slider || !dots) return;

  const total = track.children.length;
  if (!total) return;

  let index = 0;
  let timer = null;
  let startX = 0;
  let moveX = 0;

  const updateDots = () => {
    Array.from(dots.children).forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  };

  const goTo = (nextIndex, manual = false) => {
    index = (nextIndex + total) % total;
    track.style.transform = `translate3d(-${index * 100}%,0,0)`;
    updateDots();

    if (manual) startAuto();
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const stopAuto = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(next, 3500);
  };

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `dot${i === 0 ? " active" : ""}`;
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i, true));
    dots.appendChild(dot);
  }

  nextBtn?.addEventListener("click", () => goTo(index + 1, true));
  prevBtn?.addEventListener("click", () => goTo(index - 1, true));

  slider.addEventListener("mouseenter", stopAuto);
  slider.addEventListener("mouseleave", startAuto);

  slider.addEventListener(
    "touchstart",
    event => {
      startX = event.touches[0].clientX;
      moveX = 0;
      stopAuto();
    },
    { passive: true }
  );

  slider.addEventListener(
    "touchmove",
    event => {
      moveX = event.touches[0].clientX - startX;
    },
    { passive: true }
  );

  slider.addEventListener("touchend", () => {
    if (Math.abs(moveX) > 40) {
      moveX > 0 ? prev() : next();
    }

    startAuto();
  });

  startAuto();
}

function initSearch() {
  const input = byId("q");
  if (!input) return;

  input.addEventListener("input", event => {
    applyFilter(event.target.value);
  });
}

function initQuickMenu() {
  const fab = byId("mcFab");
  const sheet = byId("mcSheet");
  const closeBtn = byId("mcClose");

  if (!fab || !sheet || !closeBtn) return;

  const open = () => {
    sheet.classList.add("show");
    fab.setAttribute("aria-expanded", "true");
    sheet.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    sheet.classList.remove("show");
    fab.setAttribute("aria-expanded", "false");
    sheet.setAttribute("aria-hidden", "true");
  };

  const toggle = () => {
    sheet.classList.contains("show") ? close() : open();
  };

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });

  document.addEventListener("click", event => {
    if (!sheet.classList.contains("show")) return;

    const clickInside = sheet.contains(event.target) || fab.contains(event.target);

    if (!clickInside) close();
  });
}

function initYear() {
  const year = byId("y");
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initLogoReload();
  initSlider();
  initSearch();
  initQuickMenu();
  loadFixtures(new Date());
});
