
const fs = require('fs');
const path = require('path');

// 1. Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const clientId = env['AMADEUS_CLIENT_ID'];
const clientSecret = env['AMADEUS_CLIENT_SECRET'];

// Minimal reimplementation of the tools for verification
async function getToken() {
    const authRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
    });
    const data = await authRes.json();
    return data.access_token;
}

async function searchCity(keyword, token) {
    console.log(`Searching IATA for: ${keyword}`);
    const res = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(keyword)}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.data && data.data.length > 0) return data.data[0].iataCode;
    return null;
}

async function searchFlights(origin, dest, date, currency, token) {
    console.log(`Searching flights: ${origin} -> ${dest} in ${currency}`);
    const searchUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${date}&adults=1&max=3&currencyCode=${currency}`;
    const res = await fetch(searchUrl, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    return data.data?.[0]?.price; // Just check first price
}

async function run() {
    try {
        const token = await getToken();
        console.log("Token acquired.");

        // Test City Search
        const mexCode = await searchCity("Mexico City", token);
        console.log(`Mexico City IATA: ${mexCode}`);

        if (mexCode) {
            // Test Flight Search with USD
            const price = await searchFlights("SFO", mexCode, "2025-12-25", "USD", token);
            console.log("Found flight price:", price);
        } else {
            console.error("Could not resolve Mexico City");
        }

    } catch (e) {
        console.error(e);
    }
}

run();
