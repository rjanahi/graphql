// login.js

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    return showError("Missing credentials");
  }

  // 1) Base64-encode credentials exactly as Go did
  const encoded = btoa(`${username}:${password}`);

  // 2) POST to your real SIGNIN_URL (set this in an env var at build time or inlined)
  const SIGNIN_URL =  "https://learn.reboo01.com/api/auth/signin";

  try {
    const res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + encoded,
        // if the API expects JSON:
        "Content-Type": "application/json"
      },
      // Go didn’t send a JSON body, but if your auth endpoint expects JSON you can include it:
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Auth error:", res.status, text);
      return showError("Invalid credentials");
    }

    // 3) Parse the Go handler’s response shape:
    //    - If it was a raw string token: token = text.replace(/(^"|"$)/g, "")
    //    - If it was {"token":"…"} JSON: parse it
    let token;
    try {
      const parsed = JSON.parse(text);
      token = parsed.token ?? parsed; // handle both {"token":…} and raw string
    } catch {
      token = text.replace(/^"(.*)"$/, "$1");
    }

    // 4) Store & redirect
    localStorage.setItem("jwt", token);
    window.location.href = "/profile.html";
  } catch (err) {
    console.error("Network error:", err);
    showError("Unexpected error, please try again.");
  }
});

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
}
