
document.addEventListener("DOMContentLoaded", function () {

    // Get HTML elements
    const mapTitle = document.getElementById("mapTitle");
    const mapDescription = document.getElementById("mapDescription");
    const mapMessage = document.getElementById("mapMessage");
    const mapContainer = document.getElementById("busMap");

    // Check required elements
    if (!mapContainer) {
        console.error("Map container #busMap not found.");
        return;
    }

    // Check Leaflet library
    if (typeof L === "undefined") {
        if (mapMessage) {
            mapMessage.textContent =
                "Map library could not load. Check your internet connection.";
        }
        return;
    }

    // Read saved journey
    let journey = null;

    try {
        const savedJourney = sessionStorage.getItem("routivaJourney");
        journey = savedJourney ? JSON.parse(savedJourney) : null;
    } catch (error) {
        console.error("Journey data error:", error);
    }

    // Initialize Bengaluru map
    const map = L.map("busMap").setView(
        [12.9716, 77.5946],
        11
    );

    // Add OpenStreetMap layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }).addTo(map);

    // Display journey information
    if (journey) {
        if (mapTitle) {
            mapTitle.textContent = "Your Journey Map";
        }

        if (mapDescription) {
            mapDescription.textContent =
                `From ${journey.start || "Starting Point"} to ${journey.destination || "Destination"}`;
        }
    } else {
        if (mapTitle) {
            mapTitle.textContent = "Explore BMTC Routes";
        }

        if (mapDescription) {
            mapDescription.textContent =
                "Explore available Bengaluru bus route maps.";
        }
    }

    if (mapMessage) {
        mapMessage.textContent = "Loading BMTC routes...";
    }

    // Load BMTC GeoJSON routes
    async function loadBusRoutes() {

        try {
            const response = await fetch("data/bmtc-routes.geojson");

            if (!response.ok) {
                throw new Error("GeoJSON file not found.");
            }

            const geojson = await response.json();

            if (!geojson.features || !Array.isArray(geojson.features)) {
                throw new Error("Invalid GeoJSON format.");
            }

            // Read selected route from URL
            const params = new URLSearchParams(window.location.search);
            const selectedRoute = params.get("route");

            let features = geojson.features;

            // Filter selected route
            if (selectedRoute) {
                features = features.filter(feature => {
                    const properties = feature.properties || {};

                    return String(
                        properties.name || ""
                    ).toLowerCase() === selectedRoute.toLowerCase();
                });
            }

            if (features.length === 0) {
                if (mapMessage) {
                    mapMessage.textContent =
                        "No matching BMTC route found in the dataset.";
                }
                return;
            }

            // Display routes on map
            const routeLayer = L.geoJSON({
                type: "FeatureCollection",
                features: features
            }, {
                style: function () {
                    return {
                        color: "#16a085",
                        weight: 5,
                        opacity: 0.85
                    };
                },

                onEachFeature: function (feature, layer) {

                    const properties = feature.properties || {};

                    const routeName = properties.name || "Unknown Route";
                    const fullName = properties.full_name || routeName;

                    const stops = Array.isArray(properties.stop_list)
                        ? properties.stop_list
                        : [];

                    const popupContent = document.createElement("div");

                    const heading = document.createElement("strong");
                    heading.textContent = routeName;

                    const description = document.createElement("p");
                    description.textContent = fullName;

                    const stopInfo = document.createElement("p");
                    stopInfo.textContent =
                        "Stops: " +
                        (stops.length || properties.stop_count || "Unavailable");

                    popupContent.appendChild(heading);
                    popupContent.appendChild(description);
                    popupContent.appendChild(stopInfo);

                    layer.bindPopup(popupContent);
                }

            }).addTo(map);

            // Zoom to routes
            if (routeLayer.getBounds().isValid()) {
                map.fitBounds(routeLayer.getBounds(), {
                    padding: [30, 30]
                });
            }

            // Success message
            if (mapMessage) {
                mapMessage.textContent =
                    `Successfully loaded ${features.length} BMTC route shape(s). ` +
                    "Route data may be incomplete or unofficial.";
            }

            console.log("Routiva BMTC routes loaded successfully.");

        } catch (error) {

            console.error("BMTC route loading error:", error);

            if (mapMessage) {
                mapMessage.textContent =
                    "Unable to load BMTC routes. Check that " +
                    "data/bmtc-routes.geojson exists inside your frontend folder " +
                    "and open the page using Live Server.";
            }
        }
    }

    // Load routes
    loadBusRoutes();

    // Fix map display sizing
    setTimeout(function () {
        map.invalidateSize();
    }, 300);

});
