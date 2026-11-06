const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

// Register a demo account
if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (name.length < 2) {
            message.textContent = "Please enter your full name.";
            return;
        }

        const accounts = JSON.parse(
            localStorage.getItem("localTransportAccounts") || "{}"
        );

        if (accounts[email]) {
            message.textContent = "An account with this email already exists.";
            return;
        }

        // Demo only: never store real passwords in localStorage.
        accounts[email] = { name: name, password: password };
        localStorage.setItem("localTransportAccounts", JSON.stringify(accounts));

        message.textContent = "Demo account created! You can now log in.";
        registerForm.reset();
    });
}

// Log in to a demo account
if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        const accounts = JSON.parse(
            localStorage.getItem("localTransportAccounts") || "{}"
        );

        const account = accounts[email];

        if (!account || account.password !== password) {
            message.textContent = "Incorrect email or password.";
            return;
        }

        // Demo-only login state
        sessionStorage.setItem("localTransportUser", JSON.stringify({
            name: account.name,
            email: email
        }));

        window.location.href = "dashboard.html";
    });
}
