const backendURL = "https://airline-search-h4y0.onrender.com";

document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("Please enter an airline name, IATA, or ICAO");
        return;
    }

    // Build API URL (your backend supports these parameters)
    let url = `${backendURL}/airline?iata=${query}&icao=${query}&name=${query}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            document.getElementById("results").innerHTML =
                `<p class="error">❌ ${data.error}</p>`;
            return;
        }

        document.getElementById("results").innerHTML = `
            <h2>${data.name || "Unknown Airline"}</h2>
            <p><strong>IATA:</strong> ${data.iata || "-"}</p>
            <p><strong>ICAO:</strong> ${data.icao || "-"}</p>
            <p><strong>Country:</strong> ${data.country || "-"}</p>
            <p><strong>Region:</strong> ${data.region || "-"}</p>
            <p><strong>Website:</strong> ${data.website || "-"}</p>
            <p><strong>Phone:</strong> ${data.phone || "-"}</p>
            <p><strong>Status:</strong> ${data.status || "-"}</p>
        `;
    } catch (err) {
        console.error(err);
        document.getElementById("results").innerHTML =
            `<p class="error">⚠ Server error. Try again later.</p>`;
    }
});
