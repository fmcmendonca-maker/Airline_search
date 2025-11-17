import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const FETCH_TIMEOUT = 10000; // 10 seconds
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Simple in-memory cache
const cache = new Map();

/**
 * Fetch with timeout wrapper
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Sanitize input string to prevent injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input = "") {
  return input.trim().replace(/[<>"'`]/g, "").substring(0, 100);
}

/**
 * Clean text by removing Wikipedia reference markers
 * @param {string} str - Text to clean
 * @returns {string} - Cleaned text
 */
function clean(str = "") {
  return str.replace(/\[.*?\]/g, "").trim();
}

/**
 * Detect continent/region from country name
 * @param {string} country - Country name
 * @returns {string} - Region name (Europe, North America, etc.)
 */
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

/**
 * Search Wikipedia to find the correct airline page title
 * @param {string} name - Airline name
 * @param {string} iata - IATA code
 * @param {string} icao - ICAO code
 * @returns {Promise<string|null>} - Wikipedia page title or null
 */
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

  const resp = await fetchWithTimeout(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AirlineFinder/1.0)" }
  });

  if (!resp.ok) return null;

  const json = await resp.json();
  const first = json?.query?.search?.[0];
  if (!first) return null;

  return first.title; // e.g. "TAP Air Portugal"
}

/**
 * Scrape airline data from Wikipedia page
 * @param {string} title - Wikipedia page title
 * @returns {Promise<object|null>} - Airline data object or null
 */
async function fetchWikipediaData(title) {
  if (!title) return null;

  const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const resp = await fetchWithTimeout(pageUrl, {
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
    observations: "",
    ceo: "",
    parent_company: "",
    destinations: "",
    hubs: ""
  };

  // Title
  data.name = clean($("#firstHeading").text()) || clean(title);
  data.shortName = data.name;

    const rows = $("table.infobox tr");
    rows.each((_, el) => {
      const rawLabel = $(el).find("th").text();
      const rawValue = $(el).find("td").text();

      const label = clean(rawLabel);
      const value = clean(rawValue);

      if (!label || !value) return;

      // IATA: usually 2-letter code
      if (/IATA/i.test(label)) {
        const match = value.match(/\b[A-Z0-9]{2}\b/);
        if (match) data.iata = match[0];
      }

      // ICAO: usually 3-letter code
      if (/ICAO/i.test(label)) {
        const match = value.match(/\b[A-Z0-9]{3}\b/);
        if (match) data.icao = match[0];
      }

      // Callsign: remove short codes & bullets, keep the remaining text
      if (/Callsign/i.test(label)) {
        let cs = value
          .replace(/\b[A-Z0-9]{2,3}\b/g, "")   // remove IATA/ICAO codes
          .replace(/[•·]/g, " ")               // clean bullet symbols
          .replace(/\s+/g, " ")                // collapse spaces
          .trim();
        if (cs) data.callsign = cs;
      }

      if (/Fleet size/i.test(label)) data.fleet_size = value;
      if (/Headquarters/i.test(label)) data.headquarters = value;
      if (/Founded/i.test(label)) data.founded = value;
      if (/Website/i.test(label)) data.website = value;
      if (/Type/i.test(label)) data.type = value;
      if (/Status/i.test(label)) data.status = value;
      if (/Category/i.test(label)) data.category = value;
      if (/Key people|CEO/i.test(label)) data.ceo = value;
      if (/Parent/i.test(label)) data.parent_company = value;
      if (/Destinations/i.test(label)) data.destinations = value;
      if (/Hubs|Focus cities/i.test(label)) data.hubs = value;
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
    let { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res
        .status(400)
        .json({ error: "Provide ?name= OR ?iata= OR ?icao=" });
    }

    // Sanitize inputs
    name = name ? sanitizeInput(name) : null;
    iata = iata ? sanitizeInput(iata).toUpperCase() : null;
    icao = icao ? sanitizeInput(icao).toUpperCase() : null;

    // Create cache key
    const cacheKey = `${name || ''}_${iata || ''}_${icao || ''}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return res.json(cached.data);
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

    // Store in cache
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    
    // Provide more specific error messages
    if (err.message === 'Request timeout') {
      return res.status(504).json({ error: "Request timeout. Wikipedia may be slow. Please try again." });
    }
    
    if (err.name === 'FetchError') {
      return res.status(503).json({ error: "Unable to reach Wikipedia. Please try again later." });
    }
    
    res.status(500).json({ error: "Server Error. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
