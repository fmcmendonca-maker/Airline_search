import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Clean text helper
function clean(str = "") {
  return str.replace(/\[.*?\]/g, "").trim();
}

app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia — stable version) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Provide ?name=" });
    }

    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AirlineScraper/1.0)" }
    });

    if (!resp.ok) {
      return res.status(404).json({ error: "No airline found" });
    }

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
      phone_sales: "",
      phone_ops: "",
      logo_url: "",
      observations: ""
    };

    // Title
    data.name = clean($("#firstHeading").text()) || name;

    // Parse infobox rows
    $("table.infobox tr").each((_, el) => {
      const th = clean($(el).find("th").text());
      const td = clean($(el).find("td").text());

      if (!th || !td) return;

      if (th.includes("IATA")) data.iata = td;
      if (th.includes("ICAO")) data.icao = td;
      if (th.includes("Callsign")) data.callsign = td;
      if (th.includes("Headquarters")) data.headquarters = td;
      if (th.includes("Founded")) data.founded = td;
      if (th.includes("Website")) data.website = td;
      if (th.includes("Status")) data.status = td;
    });

    // Logo
    const logo = $("table.infobox img").first().attr("src");
    if (logo) {
      data.logo_url = logo.startsWith("http") ? logo : "https:" + logo;
    }

    // Summary
    const summary = $("#mw-content-text p").first().text().trim();
    if (summary) data.observations = summary;

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
