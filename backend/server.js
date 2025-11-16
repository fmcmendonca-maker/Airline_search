import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Small helper to clean text
function clean(str = "") {
  return str.replace(/\[.*?\]/g, "").trim();
}

// Simple region detection from country name
function detectRegion(country = "") {
  const c = country.toLowerCase();

  const europe = [
    "portugal", "spain", "france", "germany", "italy", "austria", "belgium",
    "netherlands", "switzerland", "ireland", "united kingdom", "uk", "norway",
    "sweden", "finland", "denmark", "czech republic", "poland", "greece",
    "hungary", "romania", "bulgaria"
  ];
  const northAmerica = [
    "united states", "usa", "canada", "mexico"
  ];
  const southAmerica = [
    "brazil", "argentina", "chile", "peru", "colombia", "uruguay", "paraguay"
  ];
  const asia = [
    "china", "japan", "india", "south korea", "korea", "thailand",
    "singapore", "malaysia", "indonesia", "vietnam", "philippines"
  ];
  const africa = [
    "south africa", "nigeria", "kenya", "ethiopia", "egypt", "morocco"
  ];
  const oceania = [
    "australia", "new zealand"
  ];

  if (europe.some(x => c.includes(x))) return "Europe";
  if (northAmerica.some(x => c.includes(x))) return "North America";
  if (southAmerica.some(x => c.includes(x))) return "South America";
  if (asia.some(x => c.includes(x))) return "Asia";
  if (africa.some(x => c.includes(x))) return "Africa";
  if (oceania.some(x => c.includes(x))) return "Oceania";

  return "";
}

// -------- Wikipedia SEARCH: get the right page title --------
async function wikipediaSearchTitle(name, iata, icao) {
  // Build a nicer query string
  let q = "";
  if (name) q = name;
  else if (iata) q = `${iata} airline`;
  else if (icao) q = `${icao} airline`;

  if (!q) return null;

  const url =
    "https://en.wikipedia.org/w/api.php" +
    `?action=query&format=json&origin=*` +
    `&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AirlineFinder/1.0)" }
  });

  if (!resp.ok) return null;

  const json = await resp.json();
  const first = json?.query?.search?.[0];
  if (!first) return null;

  return first.title; // e.g. "TAP Air Portugal"
}

// -------- Wikipedia PAGE scraper --------
async function fetchWikipediaData(title) {
  if (!title) return null;

  const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const resp = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AirlineFinder/1.0)" }
  });

  if (!resp.ok) return null;

  const html = await resp.text();
  const $ = load(html);

  let data = {
    name: "",
    shortName: "",
    iata: "",
    icao: "",
    country: "",
    region: "",
    fleet_size: "",
    aircraft_types: "",
    headquarters: "",
    founded: "",
    website: "",
    email: "",
    phone: "",
    callsign: "",
    type: "",
    status: "",
    category: "",
    email_sales: "",
    email_ops: "",
    logo_url: "",
    phone_sales: "",
    phone_ops: "",
    observations: ""
  };

  // Title
  data.name = clean($("#firstHeading").text()) || clean(title);
  data.shortName = data.name;

  const rows = $("table.infobox tr");

  rows.each((_, el) => {
    const label = clean($(el).find("th").text());
    const value = clean($(el).find("td").text());

    if (!label || !value) return;

    if (/IATA/i.test(label)) data.iata = value;
    if (/ICAO/i.test(label)) data.icao = value;
    if (/Callsign/i.test(label)) data.callsign = value;
    if (/Fleet size/i.test(label)) data.fleet_size = value;
    if (/Headquarters/i.test(label)) data.headquarters = value;
    if (/Founded/i.test(label)) data.founded = value;
    if (/Website/i.test(label)) data.website = value;
    if (/Type/i.test(label)) data.type = value;
    if (/Status/i.test(label)) data.status = value;
    if (/Category/i.test(label)) data.category = value;
  });

  // Country & region from headquarters (last piece)
  if (data.headquarters) {
    const parts = data.headquarters.split(",");
    const countryGuess = clean(parts[parts.length - 1]);
    data.country = countryGuess;
    data.region = detectRegion(countryGuess);
  }

  // First paragraph as observations
  const firstP = $("#mw-content-text p")
    .filter((_, el) => clean($(el).text()).length > 0)
    .first()
    .text()
    .trim();

  if (firstP) {
    data.observations = firstP;
  }

  // Logo
  const logoSrc = $("table.infobox img").first().attr("src");
  if (logoSrc) {
    data.logo_url = logoSrc.startsWith("http")
      ? logoSrc
      : "https:" + logoSrc;
  }

  if (!data.name) return null;
  return data;
}

// ----------------------- ROUTES -----------------------

app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res
        .status(400)
        .json({ error: "Provide ?name= OR ?iata= OR ?icao=" });
    }

    // 1) Find the correct Wikipedia title
    const title = await wikipediaSearchTitle(name, iata, icao);
    if (!title) {
      return res.status(404).json({ error: "No airline found on Wikipedia" });
    }

    // 2) Scrape that page
    const data = await fetchWikipediaData(title);
    if (!data) {
      return res.status(404).json({ error: "No airline found on Wikipedia" });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
