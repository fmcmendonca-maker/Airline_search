Airline Data Scraper & Intelligence API

This has no commercial or distribution intent, 
Just a test to check how AI tools work, with min technical IT and programing experience. Using Visual studio code with copilot, windsurf, external chat-GTP Grok and Perplexity. hosting with Rrender linked direct to github repositories. 

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
    │   └── .env (LOCAL ONLY)
    │
    └── frontend/
        ├── index.html
        ├── style.css
        └── app.js

MAIN FEATURES
-------------

1. Multi-Source Airline Intelligence (Backend)
   - Wikipedia summary
   - Wikipedia infobox
   - DBPedia semantic data
   - AviationStack API
   - IATACodes API
   - AirlineCodes API
   - Planespotters Fleet API
   - OpenSky Network (live flights)
   - Website scraping for emails and phone numbers

2. Smart Data Fusion
   - Cleans and merges conflicting data from various sources
   - Fallback logic for missing codes or incomplete fields

3. Automatic Region Detection
   - Converts any country into continent/region

4. Clean REST API
   - GET /airline endpoint
   - Accepts name, IATA, or ICAO

5. Simple Front-End UI
   - Search bar
   - Displays all airline fields returned by the API

---------------------------------------------------------------------

PROJECT STRUCTURE
-----------------

airline-app/
    backend/
        server.js
        package.json
        .env
        README.md
    frontend/
        index.html
        style.css
        app.js


---------------------------------------------------------------------

FRONTEND SETUP
--------------

1. Start backend first.
2. Open:
    frontend/index.html
3. Enter airline name, IATA, or ICAO.

---------------------------------------------------------------------

API RESPONSE FIELDS
-------------------

name
shortName
iata
icao
country
region
fleet_size
aircraft_types
headquarters
founded
website
email
phone
callsign
type
status
category
email_sales
email_ops
logo_url
phone_sales
phone_ops
observations

---------------------------------------------------------------------

TECHNOLOGIES USED
-----------------

Backend:
- Node.js, Express, node-fetch, Cheerio, Dotenv

Frontend:
- HTML, CSS, JavaScript

---------------------------------------------------------------------

---------------------------------------------------------------------

LICENSE
------
MIT License
@Aerohub by fmcmendonca-maker - aerohub.IT
