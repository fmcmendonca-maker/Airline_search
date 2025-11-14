Airline Data Scraper & Intelligence API

    This project is a full airline information engine that collects, merges, and cleans data from multiple external sources. It includes a backend REST API and a simple HTML/JavaScript frontend for searching airlines by name, IATA, or ICAO.

MAIN FEATURES

Multi-Source Airline Intelligence (Backend)
    Wikipedia summary
    Wikipedia infobox
    DBPedia semantic data
    AviationStack API
    IATACodes API
    AirlineCodes API
    Planespotters Fleet API
    OpenSky Network (live flights)
    Website scraping for emails and phone numbers

Smart Data Fusion
    Cleans and merges conflicting data from various sources
    Fallback logic for missing codes or incomplete fields
Automatic Region Detection
    Converts any country into continent/region
Clean REST API
    GET /airline endpoint
    Accepts name, IATA, or ICAO
Simple Front-End UI
    Search bar
    Displays all airline fields returned by the API

Structure 
    airline-app/
    │
    ├── backend/
    │   ├── server.js
    │   ├── package.json
    │   └── .env (LOCAL ONLY — do NOT upload)
    │
    └── frontend/
        ├── index.html
        ├── style.css
        └── app.js

@fmcmendonca-maker - aerohub.IT
