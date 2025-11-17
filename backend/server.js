import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Clean strings
const clean = (s = "") => s.replace(/\[.*?\]/g, "").trim();

// Timed fetch (prevents infinite hanging)
async function timedFetch(url, options = {}, timeout = 2500) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout))
  ]);
}

// ---------------------- AIRFLEETS SCRAPER ----------------------
async function fetchAirfleets(name, icao) {
  try {
    const key = icao || name;
    if (!key) return {};

    const url = `https://www.airfleets.net/flottecie/${encodeURIComponent(key)}.htm`;

    const resp = await timedFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36"
      }
    });

    if (!resp.ok) return {};

    const html = await resp.text();
    const $ = load(html);

    let fleet = "";
    const types = new Set();

    $("td").each((_, td) => {
      const text = $(td).text().trim();
      if (text === "Total") {
        fleet = $(td).next("td").text().trim();
      }
    });

    $("table tr").each((_, tr) => {
      const cols = $(tr).find("td");
      if (cols.length >= 2) {
        const type = $(cols[0]).text().trim();
        if (type && type.length < 50 && !/^Total/i.test(type)) {
          types.add(type);
        }
      }
    });

    return {
      fleet_size: fleet || "",
      aircraft_types: [...types].join(", ")
    };
  } catch (err) {
    console.log("Airfleets error:", err.message);
    return {}; // safe fallback
  }
}

// ---------------------- MAIN SCRAPER ----------------------
app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao)
      return res.status(400).json({ error: "Provide ?name= OR ?iata= OR ?icao=" });

    const term = name || iata || icao;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`;

    const resp = await timedFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36"
      }
    });

    if (!resp.ok) return res.status(404).json({ error: "Airline not found" });

    const html = await resp.text();
    const $ = load(html);

    // Handle redirect pages
    const redirectedTitle = $(".redirectText a").first().attr("href");
    if (redirectedTitle) {
      const redirectUrl = "https://en.wikipedia.org" + redirectedTitle;
      const r2 = await fetch(redirectUrl);
      if (r2.ok) {
        const h2 = await r2.text();
        $ = load(h2);
      }
    }

    const data = {
      name: clean($("#firstHeading").text()) || term,
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
      phone_sales: "",
      phone_ops: "",
      key_people: "",
      logo_url: "",
      observations: ""
    };

    // If no infobox at all → fail safely
    const rows = $("table.infobox tr");
    if (rows.length === 0)
      return res.status(404).json({ error: "No airline found" });

    rows.each((_, el) => {
      const label = clean($(el).find("th").text());
      const value = clean($(el).find("td").text());
      if (!label || !value) return;

      if (/Short name/i.test(label)) data.shortName = value;

      if (/IATA/i.test(label))
        data.iata = (value.match(/\b[A-Z0-9]{2}\b/) || [""])[0];

      if (/ICAO/i.test(label))
        data.icao = (value.match(/\b[A-Z0-9]{3}\b/) || [""])[0];

      if (/Callsign/i.test(label))
        data.callsign = clean(value.replace(/\b[A-Z0-9]{2,3}\b/g, ""));

      if (/Headquarters/i.test(label)) data.headquarters = value;
      if (/Founded/i.test(label)) data.founded = value;
      if (/Website/i.test(label)) data.website = value;
      if (/Key people/i.test(label)) data.key_people = value;

      if (/Ceased|Defunct/i.test(label)) data.status = "Defunct";
      if (/Commenced|Operating/i.test(label)) data.status = "Active";

      if (/Type/i.test(label)) data.type = value;
    });

    const firstP = $("#mw-content-text p").first().text().trim();
    if (firstP) data.observations = firstP;

    const logo = $("table.infobox img").first().attr("src");
    if (logo) data.logo_url = logo.startsWith("http") ? logo : "https:" + logo;

    // ---------- AIRFLEETS MERGE ----------
    const af = await fetchAirfleets(data.name, data.icao);
    if (af.fleet_size) data.fleet_size = af.fleet_size;
    if (af.aircraft_types) data.aircraft_types = af.aircraft_types;

    return res.json(data);

  } catch (err) {
    console.log("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ----------------------
app.listen(PORT, () => console.log(`API running on ${PORT}`));
