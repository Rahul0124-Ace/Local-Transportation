
const journeyForm = document.getElementById("journeyForm");
const startInput = document.getElementById("start");
const destinationInput = document.getElementById("destination");
const locationButton = document.getElementById("locationButton");
const journeyMessage = document.getElementById("journeyMessage");

// Get the user's current location with permission.
locationButton.addEventListener("click", function () {
    if (!navigator.geolocation) {
        journeyMessage.textContent =
            "Your browser does not support location detection.";
        return;
    }

    journeyMessage.textContent = "Requesting your location permission...";

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            startInput.value =
                `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

            journeyMessage.textContent =
                "Location found! Now enter your destination.";
        },
        function () {
            journeyMessage.textContent =
                "Location unavailable. Please enter your starting point manually.";
        }
    );
});

// Save the journey and open the separate results page.
journeyForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const start = startInput.value.trim();
    const destination = destinationInput.value.trim();

    if (!start || !destination) {
        journeyMessage.textContent =
            "Please enter both your starting point and destination.";
        return;
    }

    if (start.toLowerCase() === destination.toLowerCase()) {
        journeyMessage.textContent =
            "Your starting point and destination must be different.";
        return;
    }

    sessionStorage.setItem("routivaJourney", JSON.stringify({
        start: start,
        destination: destination
    }));

    window.location.href = "bus-results.html";
});
