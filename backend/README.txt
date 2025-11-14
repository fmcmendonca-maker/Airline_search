Airline Data Scraper & Intelligence API
======================================

This project is a full airline information engine that collects, merges, and cleans data from multiple external sources. It includes a backend REST API and a simple HTML/JavaScript frontend for searching airlines by name, IATA, or ICAO.

---------------------------------------------------------------------

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

BACKEND SETUP
-------------

1. Install dependencies:

    cd backend
    npm install

2. Create a .env file with your API keys:

    AVIATIONSTACK_KEY=your_aviationstack_key
    IATACODES_KEY=your_iatacodes_key

3. Run the backend:

    npm start

Backend runs at:
http://localhost:3000/airline

Examples:
- /airline?iata=BA
- /airline?icao=BAW
- /airline?name=British Airways

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

SECURITY NOTES
--------------

- Do not commit .env to version control.
- Keep all API keys private.

---------------------------------------------------------------------

LICENSE
-------

MIT License
