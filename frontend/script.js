const API_URL = "https://airline-search-h4y0.onrender.com/airline";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");

const resultBox = document.getElementById("result");
const errorBox = document.getElementById("errorBox");
const loading = document.getElementById("loading");

searchBtn.addEventListener("click", searchAirline);

async function searchAirline() {
    const value = searchInput.value.trim();

    if (!value) {
        showError("Please enter airline name, IATA or ICAO.");
        return;
    }

    showLoading();

    let query = "";

    if (value.length === 2) query = `iata=${value}`;
    else if (value.length === 3) query = `icao=${value}`;
    else query = `name=${value}`;

    try {
        const res = await fetch(`${API_URL}?${query}`);
        const data = await res.json();

        if (data.error) {
            showError("Airline not found.");
            return;
        }

        displayResult(data);

    } catch (err) {
        showError("Server error. Try again.");
    }
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
    resultBox.classList.add("hidden");
    loading.classList.add("hidden");
}

function showLoading() {
    loading.classList.remove("hidden");
    errorBox.classList.add("hidden");
    resultBox.classList.add("hidden");
}

function displayResult(data) {
    loading.classList.add("hidden");
    errorBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    document.getElementById("airlineName").textContent = data.name || "";

    if (data.logo_url) {
        const logo = document.getElementById("airlineLogo");
        logo.src = data.logo_url;
        logo.classList.remove("hidden");
    }

    const fields = [
        "shortName", "iata", "icao", "country", "region",
        "fleet_size", "aircraft_types", "headquarters",
        "founded", "website", "email", "phone",
        "callsign", "type", "status", "category",
        "email_sales", "email_ops", "phone_sales", 
        "phone_ops", "observations"
    ];

    fields.forEach(f => {
        document.getElementById(f).textContent = data[f] || "-";
    });
}
