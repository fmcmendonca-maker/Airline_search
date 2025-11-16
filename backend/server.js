import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// ---------- helpers ----------
const clean = v => (v ? v.toString().trim() : null);

function detectRegion(country) {
  if (!country) return null;
  const c = country.toLowerCase();

  if ([
    "united states", "usa", "canada", "mexico", "bahamas",
    "cuba", "guatemala", "panama", "costa rica"
  ].some(x => c.includes(x))) return "North America";

  if ([
    "brazil", "argentina", "chile", "peru", "bolivia",
    "colombia", "uruguay", "paraguay", "ecuador", "venezuela"
  ].some(x => c.includes(x))) return "South America";

  if ([
    "united kingdom", "uk", "france", "germany", "austria",
    "spain", "italy", "portugal", "switzerland", "netherlands",
    "belgium", "sweden", "norway", "finland", "ireland", "poland"
  ].some(x => c.includes(x))) return "Europe";

  if ([
    "china", "india", "japan", "korea", "indonesia", "thailand",
    "malaysia", "singapore", "vietnam", "philippines", "qatar",
    "uae", "saudi arabia"
  ].some(x => c.includes(x))) return "Asia";

  if ([
    "south africa", "kenya", "nigeria", "ethiopia", "egypt",
    "morocco", "ghana", "tanzania"
  ].some(x => c.includes(x))) return "Africa";

  if ([
    "australia", "new zealand", "fiji", "papua new guinea"
  ].some(x => c.includes(x))) return "Oceania";

  return null;
}

function classify(summary = "") {
  summary = summary.toLowerCase();

  let type = "charter";
  if (summary.includes("flag carrier")) type = "major";
  if (summary.includes("regional")) type = "regional";
  if (summary.includes("cargo")) type = "cargo";

  let category = "Other";
  if (summary.includes("passenger") || summary.includes("airline")) category = "Passenger";
  if (summary.includes("cargo") || summary.includes("freight")) category = "Cargo";

  let status = "Active";
  if (summary.includes("defunct") || summary.includes("ceased") || summary.includes("former")) {
    status = "Defunct";
  }

  return { type, category, status };
}

// ---------- Wikipedia Search ----------
async function wikiSearch(query) {
  if (!query) return null;

  const url =
    "https://en.wikipedia.org/w/api.php" +
    "?action=query&format=json&origin=*&prop=pageprops|extracts|info" +
    "&inprop=url&generator=search" +
    `&gsrsearch=${encodeURIComponent(query + " airline")}` +
    "&gsrlimit=1&exintro=1&explaintext=1";

  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  const pages = j?.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0];

  return {
    title: clean(page.title),
    url: clean(page.fullurl),
    summary: clean(page.extract)
  };
}

// ---------- Wikipedia Infobox ----------
async function wikiInfobox(title) {
  if (!title) return {};
  const url =
    "https://en.wikipedia.org/w/api.php" +
    "?origin=*&action=query&format=json&prop=revisions" +
    "&rvprop=content&rvslots=main" +
    `&titles=${encodeURIComponent(title)}`;

  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  const page = j?.query?.pages && Object.values(j.query.pages)[0];
  const text = page?.revisions?.[0]?.slots?.main?.["*"];
  if (!text) return {};

  function extract(key) {
    const rgx = new RegExp(`\\|\\s*${key}\\s*=\\s*(.*)`, "i");
    const m = text.match(rgx);
    if (!m) return null;
    return clean(
      m[1]
        .replace(/<[^>]*>/g, "")
        .replace(/\[\[|\]\]/g, "")
        .split(/<!--/)[0]
    );
  }

  return {
    iata: extract("IATA"),
    icao: extract("ICAO"),
    callsign: extract("callsign"),
    founded: extract("founded"),
    headquarters: extract("headquarters"),
    website: extract("website")
  };
}

// ---------- Planespotters (fleet + logo) ----------
async function fetchPlanespotters(iata, icao) {
  // Prefer ICAO
  const code = icao || iata;
  if (!code) return null;

  try {
    const url = `https://api.planespotters.net/pub/airline/${code}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();

    const fleet = j?.fleet || [];
    const counts = {};

    fleet.forEach(ac => {
      const t = ac.icao_type || ac.icao || ac.type;
      if (!t) return;
      counts[t] = (counts[t] || 0) + 1;
    });

    let aircraft_types = null;
    if (Object.keys(counts).length > 0) {
      aircraft_types = Object.entries(counts)
        .map(([t, q]) => `${q}x${t}`)
        .join(", ");
    }

    return {
      fleet_size: fleet.length || null,
      aircraft_types,
      logo_url: j?.airline?.logo || null,
      country: clean(j?.airline?.country) || null,
      website: clean(j?.airline?.website) || null
    };
  } catch {
    return null;
  }
}

// ---------- MAIN ROUTE ----------
app.get("/airline", async (req, res) => {
  try {
    let { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide name, iata or icao" });
    }

    const query = name || iata || icao;

    // 1) Wikipedia base info
    const wiki = await wikiSearch(query);
    const info = await wikiInfobox(wiki?.title);

    const realIata = clean((iata || info.iata || "").toUpperCase()) || null;
    const realIcao = clean((icao || info.icao || "").toUpperCase()) || null;

    // 2) Planespotters for fleet + logo + country
    const ps = await fetchPlanespotters(realIata, realIcao);

    // 3) Country + region
    let country = null;

    if (ps?.country) {
      country = ps.country;
    } else if (info.headquarters) {
      const parts = info.headquarters.split(",");
      country = clean(parts[parts.length - 1]);
    }

    const region = detectRegion(country);

    // 4) Classification
    const { type, category, status } = classify(wiki?.summary || "");

    // 5) Logo
    const logo_url =
      ps?.logo_url ||
      (realIata ? `https://pics.avs.io/200/200/${realIata}@2x.png` : null);

    // If absolutely nothing was found, return 404
    if (!wiki && !info && !ps) {
      return res.status(404).json({ error: "No airline found" });
    }

    res.json({
      name: clean(wiki?.title || name || null),
      shortName: clean(name || wiki?.title || null),
      iata: realIata,
      icao: realIcao,
      country,
      region,
      fleet_size: ps?.fleet_size || null,
      aircraft_types: ps?.aircraft_types || null,
      headquarters: info.headquarters || null,
      founded: info.founded || null,
      website: ps?.website || info.website || null,
      email: null,
      phone: null,
      callsign: info.callsign || null,
      type,
      status,
      category,
      email_sales: null,
      email_ops: null,
      logo_url,
      phone_sales: null,
      phone_ops: null,
      observations: wiki?.summary || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error", details: err.toString() });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Airline multi-source scraper API running ✔");
});

app.listen(PORT, () => {
  console.log("Airline API running on port", PORT);
});
