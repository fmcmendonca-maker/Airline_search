const API_URL = "https://airline-search-h4y0.onrender.com/airline";

async function searchAirline() {
    const input = document.getElementById("searchInput").value.trim();

    if (!input) {
        alert("Please enter airline name, IATA, or ICAO.");
        return;
    }

    let param = "";

    if (input.length === 2 || input.length === 3) {
        param = `iata=${input.toUpperCase()}`;
    } else {
        param = `name=${encodeURIComponent(input)}`;
    }

    try {
        const response = await fetch(`${API_URL}?${param}`);
        const data = await response.json();

        document.getElementById("result").textContent =
            JSON.stringify(data, null, 2);

    } catch (error) {
        console.error(error);
        alert("Server error. Please try again later.");
    }
}
