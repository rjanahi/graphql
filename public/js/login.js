// login.js

const SIGNIN_URL = "https://learn.reboot01.com/api/auth/signin";

document.getElementById("loginForm")
  .addEventListener("submit", handleLogin);

async function handleLogin(e) {
  e.preventDefault();
  clearError();

  const user = document.getElementById("userOrEmail").value.trim();
  const pwd = document.getElementById("password").value;
  if (!user || !pwd) return showError("Both fields are required");

  const encoded = btoa(`${user}:${pwd}`);

  try {
    // 1) Perform the fetch
    const res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "Content-Type": "application/json"    // helps avoid weird CORS preflights
      }
    });

    // 2) If 400/401, try to parse and show that error
    if (!res.ok) {
      let errBody;
      try { errBody = await res.json(); }
      catch (_) { errBody = { error: await res.text() }; }
      return showError(errBody.error || "Invalid credentials");
    }

    // 3) Grab the raw body as text
    const raw = await res.text();
    console.log("Raw signin response:", raw);

    // 4) Try JSON.parse → extract token key, else assume raw is the JWT
    let jwt;
    try {
      const obj = JSON.parse(raw);
      jwt = obj.token || obj.jwt || obj.accessToken;
    } catch {
      // strip surrounding quotes if present
      jwt = raw.replace(/^"(.*)"$/, "$1");
    }

    // 5) Validate it’s actually a three-part JWT
    if (!jwt || jwt.split(".").length !== 3) {
      throw new Error(`Invalid JWT received: "${jwt}"`);
    }

    // 6) Store & redirect
    console.log("Using JWT:", jwt);
    localStorage.setItem("jwt", jwt);
    window.location.href = "profile.html";

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message.startsWith("Invalid JWT")
      ? "Unexpected server response"
      : `Network error: ${err.message}`);
  }
}

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
}
