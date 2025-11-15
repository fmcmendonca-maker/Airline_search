import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🟦 Root route to verify backend is running
app.get("/", (req, res) => {
  res.send("Airline Backend API is running ✔");
});

// 🟦 Main airline lookup route
app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide name, iata, or icao" });
    }

    // Build URL for scraping
    const searchTerm = iata || icao || name;
    const url = `https://www.airlineupdate.com/content_public/airlines/${searchTerm}.htm`;

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract fields
    const data = {
      name: $("h1").text().trim() || "",
      shortName: $("td:contains('Short Name')").next().text().trim() || "",
      iata: $("td:contains('IATA')").next().text().trim() || "",
      icao: $("td:contains('ICAO')").next().text().trim() || "",
      country: $("td:contains('Country')").next().text().trim() || "",
      region: $("td:contains('Region')").next().text().trim() || "",
      fleet_size: $("td:contains('Fleet Size')").next().text().trim() || "",
      aircraft_types: $("td:contains('Aircraft Types')").next().text().trim() || "",
      headquarters: $("td:contains('Headquarters')").next().text().trim() || "",
      founded: $("td:contains('Founded')").next().text().trim() || "",
      website: $("td:contains('Website')").next().text().trim() || "",
      email: $("td:contains('Email')").next().text().trim() || "",
      phone: $("td:contains('Phone')").next().text().trim() || "",
      callsign: $("td:contains('Callsign')").next().text().trim() || "",
      type: $("td:contains('Type')").next().text().trim() || "",
      status: $("td:contains('Status')").next().text().trim() || "",
      category: $("td:contains('Category')").next().text().trim() || "",
      email_sales: $("td:contains('Sales Email')").next().text().trim() || "",
      email_ops: $("td:contains('Ops Email')").next().text().trim() || "",
      logo_url: $("img.logo").attr("src") || "",
      phone_sales: $("td:contains('Sales Phone')").next().text().trim() || "",
      phone_ops: $("td:contains('Ops Phone')").next().text().trim() || "",
      observations: $("td:contains('Observations')").next().text().trim() || ""
    };

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// 🟦 Start server
app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
