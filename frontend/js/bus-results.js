const journeySummary = document.getElementById("journeySummary");
const busRouteList = document.getElementById("busRouteList");
const resultsMessage = document.getElementById("resultsMessage");
const startPoint = document.getElementById("startPoint");
const endPoint = document.getElementById("endPoint");

function normalizePlace(place) {
    return String(place || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

let journeyMap = null;
let startMarker = null;
let endMarker = null;
let journeyLine = null;
let displayedBusLines = [];

if (document.getElementById("journeyMap") && window.L) {
    journeyMap = L.map("journeyMap").setView([12.9716, 77.5946], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }).addTo(journeyMap);
}

async function findCoordinates(place) {
    const knownPlaces = {
        "majestic": [12.9767, 77.5713],
        "kempegowda bus station": [12.9767, 77.5713],
        "kbs": [12.9767, 77.5713],
        "whitefield": [12.9698, 77.7499],
        "electronic city": [12.8452, 77.6602],
        "silk board": [12.9177, 77.6233],
        "indiranagar": [12.9784, 77.6408],
        "hebbal": [13.0358, 77.5970],
        "kr puram": [13.0075, 77.6959],
        "krishnarajapuram": [13.0075, 77.6959],
        "yelahanka": [13.1007, 77.5963],
        "banashankari": [12.9250, 77.5640],
        "jayanagar": [12.9250, 77.5838],
        "mg road": [12.9756, 77.6066],
        "shivajinagara": [12.9850, 77.6040],
        "shivajinagar": [12.9850, 77.6040],
        "kumaraswamy layout": [12.9029, 77.5616],
        "kempegowda international airport": [13.1986, 77.7066],
        "bangalore airport": [13.1986, 77.7066]
    };

    const key = normalizePlace(place);

    if (knownPlaces[key]) {
        return knownPlaces[key];
    }

    try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", `${place}, Bengaluru, India`);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "1");

        const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) return null;

        const results = await response.json();

        if (results.length > 0) {
            return [
                Number(results[0].lat),
                Number(results[0].lon)
            ];
        }
    } catch (error) {
        console.warn("Location search failed:", error);
    }

    return null;
}

async function loadBmtcRoutes() {
    try {
        const response = await fetch("data/bmtc-routes.geojson");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.features)) {
            throw new Error("GeoJSON features are missing.");
        }

        console.log("BMTC routes loaded:", data.features.length);
        return data.features;

    } catch (error) {
        console.error("BMTC route loading failed:", error);
        return null;
    }
}

function findMatchingRoutes(features, start, destination) {
    const startName = normalizePlace(start);
    const destinationName = normalizePlace(destination);

    if (!features) return [];

    return features.filter(feature => {
        const properties = feature.properties || {};
        const stops = Array.isArray(properties.stop_list)
            ? properties.stop_list
            : [];

        const normalizedStops = stops.map(normalizePlace);

        // Match both stops in the same bus route.
        // Stop order matters: destination must occur after the start.
        const startIndex = normalizedStops.findIndex(stop =>
            stop === startName ||
            stop.includes(startName) ||
            startName.includes(stop)
        );

        if (startIndex === -1) return false;

        const destinationIndex = normalizedStops.findIndex(
            (stop, index) =>
                index > startIndex &&
                (
                    stop === destinationName ||
                    stop.includes(destinationName) ||
                    destinationName.includes(stop)
                )
        );

        return destinationIndex > startIndex;
    });
}

function clearBusLines() {
    if (journeyMap) {
        displayedBusLines.forEach(line => {
            journeyMap.removeLayer(line);
        });
    }

    displayedBusLines = [];
}

function drawBusRoute(feature) {
    if (!journeyMap || !feature.geometry) return null;

    let coordinates = [];

    if (feature.geometry.type === "LineString") {
        coordinates = feature.geometry.coordinates || [];
    } else if (feature.geometry.type === "MultiLineString") {
        coordinates = (feature.geometry.coordinates || []).flat();
    }

    // GeoJSON coordinates use [longitude, latitude].
    const latLngs = coordinates
        .filter(point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1]))
        )
        .map(point => [Number(point[1]), Number(point[0])]);

    if (latLngs.length < 2) return null;

    const properties = feature.properties || {};

    const line = L.polyline(latLngs, {
        color: "#087f8c",
        weight: 5,
        opacity: 0.85
    }).addTo(journeyMap);

    line.bindPopup(
        `<strong>${escapeHtml(properties.name || "BMTC bus")}</strong><br>` +
        `${escapeHtml(properties.full_name || "")}<br>` +
        `Stops: ${Number(properties.stop_count) || "Unknown"}`
    );

    displayedBusLines.push(line);
    return line;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showRouteCards(routes, start, destination) {
    busRouteList.textContent = "";

    if (routes.length === 0) {
        const note = document.createElement("p");
        note.textContent =
            "No direct BMTC route was matched by the entered stop names. Try using the exact bus-stop names from the BMTC data. Connecting buses are not calculated yet.";
        busRouteList.appendChild(note);
        return;
    }

    const heading = document.createElement("h2");
    heading.textContent = "Matching BMTC bus routes";
    busRouteList.appendChild(heading);

    routes.forEach(feature => {
        const properties = feature.properties || {};
        const stops = Array.isArray(properties.stop_list)
            ? properties.stop_list
            : [];

        const card = document.createElement("article");
        card.className = "bus-result-card";

        const title = document.createElement("h3");
        title.textContent = properties.name || "BMTC bus";

        const routeName = document.createElement("p");
        routeName.textContent =
            properties.full_name || `${start} → ${destination}`;

        const stopInfo = document.createElement("p");
        stopInfo.textContent =
            `Stops on route: ${properties.stop_count || stops.length}`;

        const times = document.createElement("p");
        const tripList = Array.isArray(properties.trip_list)
            ? properties.trip_list
            : [];

        times.textContent = tripList.length
            ? `Listed departure times: ${tripList.slice(0, 5).join(", ")}${tripList.length > 5 ? " …" : ""}`
            : "Departure times not listed.";

        card.append(title, routeName, stopInfo, times);
        busRouteList.appendChild(card);
    });
}

async function showBusResults() {
    const savedJourney = sessionStorage.getItem("routivaJourney");

    if (!savedJourney) {
        journeySummary.textContent = "No journey selected.";
        startPoint.textContent = "Not selected";
        endPoint.textContent = "Not selected";
        busRouteList.textContent =
            "Please return to the journey planner and enter your locations.";

        if (resultsMessage) resultsMessage.textContent = "";
        return;
    }

    let journey;

    try {
        journey = JSON.parse(savedJourney);
    } catch (error) {
        journeySummary.textContent = "Journey details could not be read.";
        startPoint.textContent = "Unavailable";
        endPoint.textContent = "Unavailable";
        busRouteList.textContent =
            "Please return to the journey planner and try again.";
        return;
    }

    const start = String(journey.start || "").trim();
    const destination = String(journey.destination || "").trim();

    if (!start || !destination) {
        journeySummary.textContent = "Incomplete journey.";
        startPoint.textContent = start || "Not selected";
        endPoint.textContent = destination || "Not selected";
        busRouteList.textContent =
            "Please enter both a starting point and destination.";
        return;
    }

    journeySummary.textContent = `From ${start} to ${destination}`;
    startPoint.textContent = start;
    endPoint.textContent = destination;

    if (resultsMessage) {
        resultsMessage.textContent = "Loading map and BMTC routes...";
    }

    if (journeyMap) {
        const [startCoords, endCoords] = await Promise.all([
            findCoordinates(start),
            findCoordinates(destination)
        ]);

        if (startMarker) journeyMap.removeLayer(startMarker);
        if (endMarker) journeyMap.removeLayer(endMarker);
        if (journeyLine) journeyMap.removeLayer(journeyLine);

        startMarker = null;
        endMarker = null;
        journeyLine = null;

        if (startCoords) {
            startMarker = L.marker(startCoords)
                .addTo(journeyMap)
                .bindPopup(`Starting point: ${escapeHtml(start)}`);
        }

        if (endCoords) {
            endMarker = L.marker(endCoords)
                .addTo(journeyMap)
                .bindPopup(`Destination: ${escapeHtml(destination)}`);
        }

        if (startCoords && endCoords) {
            journeyLine = L.polyline([startCoords, endCoords], {
                color: "#777777",
                weight: 3,
                opacity: 0.7,
                dashArray: "8, 8"
            }).addTo(journeyMap);

            journeyMap.fitBounds(
                L.latLngBounds([startCoords, endCoords]).pad(0.2)
            );

        } else if (startCoords || endCoords) {
            journeyMap.setView(startCoords || endCoords, 13);
        }

        setTimeout(() => journeyMap.invalidateSize(), 200);
    }

    const features = await loadBmtcRoutes();

    if (features === null) {
        if (resultsMessage) {
            resultsMessage.textContent =
                "The map is shown, but BMTC data could not be loaded. Check that the file is in frontend/data/bmtc-routes.geojson and open the project using a local server.";
        }

        busRouteList.textContent =
            "BMTC data failed to load. Check the browser console for details.";
        return;
    }

    const matchingRoutes = findMatchingRoutes(
        features,
        start,
        destination
    );

    clearBusLines();

    const drawnLines = matchingRoutes
        .map(drawBusRoute)
        .filter(Boolean);

    showRouteCards(matchingRoutes, start, destination);

    if (drawnLines.length > 0 && journeyMap) {
        const allPoints = drawnLines.flatMap(line =>
            line.getLatLngs()
        );

        if (allPoints.length > 0) {
            journeyMap.fitBounds(L.latLngBounds(allPoints).pad(0.15));
        }
    }

    if (resultsMessage) {
        if (matchingRoutes.length > 0) {
            resultsMessage.textContent =
                `Found ${matchingRoutes.length} BMTC route(s) matching both stop names. Tap a route line on the map for details.`;
        } else {
            resultsMessage.textContent =
                "No direct BMTC route matched both entered stop names. Try exact BMTC stop names. Bus transfers are not calculated yet.";
        }
    }

    console.log("Matching BMTC routes:", matchingRoutes);
}

showBusResults();