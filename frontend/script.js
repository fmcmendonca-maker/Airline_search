// API Configuration - automatically detects environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:3000/airline"
  : "https://airline-search-h4y0.onrender.com/airline";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const resultCard = document.getElementById("resultCard");
const logoImg = document.getElementById("airlineLogo");

const themeToggle = document.getElementById("themeToggle");

// ---- THEME ----
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }
})();

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// ---- SEARCH ----
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = searchInput.value.trim();

  if (!value) {
    showError("Please enter airline name, IATA or ICAO.");
    return;
  }

  await searchAirline(value);
});

async function searchAirline(value) {
  clearUI();
  showLoading();

  let params = new URLSearchParams();

  if (value.length === 2) {
    params.set("iata", value.toUpperCase());
  } else if (value.length === 3) {
    params.set("icao", value.toUpperCase());
  } else {
    params.set("name", value);
  }

  try {
    const res = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || "Airline not found.");
      return;
    }

    displayResult(data);
  } catch (err) {
    console.error(err);
    showError("Server error. Please try again later.");
  }
}

function clearUI() {
  errorBox.classList.add("hidden");
  resultCard.classList.add("hidden");
}

function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(msg) {
  hideLoading();
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  resultCard.classList.add("hidden");
}

function displayResult(data) {
  hideLoading();
  resultCard.classList.remove("hidden");

  document.getElementById("airlineName").textContent = data.name || "Unknown airline";

  const subtitleParts = [];
  if (data.iata) subtitleParts.push(`IATA ${data.iata}`);
  if (data.icao) subtitleParts.push(`ICAO ${data.icao}`);
  if (data.country) subtitleParts.push(data.country);

  document.getElementById("airlineSubtitle").textContent =
    subtitleParts.length ? subtitleParts.join(" • ") : "";

  if (data.logo_url) {
    logoImg.src = data.logo_url;
    logoImg.classList.remove("hidden");
  } else {
    logoImg.classList.add("hidden");
  }

  const fields = [
    "shortName",
    "iata",
    "icao",
    "country",
    "region",
    "fleet_size",
    "aircraft_types",
    "headquarters",
    "founded",
    "email",
    "phone",
    "callsign",
    "type",
    "status",
    "category",
    "email_sales",
    "email_ops",
    "phone_sales",
    "phone_ops",
    "ceo",
    "parent_company",
    "destinations",
    "hubs",
    "observations"
  ];

  fields.forEach((f) => {
    const el = document.getElementById(f);
    if (!el) return;

    const val = data[f];

    if (!val) {
      el.textContent = "-";
    } else {
      el.textContent = val;
    }
  });

  // Website as clickable link if present
  const websiteEl = document.getElementById("website");
  websiteEl.textContent = "-";
  websiteEl.innerHTML = "";

  if (data.website) {
    const url = data.website.startsWith("http")
      ? data.website
      : "https://" + data.website.replace(/^\/+/, "");

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = url;
    websiteEl.appendChild(a);
  } else {
    websiteEl.textContent = "-";
  }
}
