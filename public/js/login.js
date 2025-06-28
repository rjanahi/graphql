// login.js

const SIGNIN_URL = "https://learn.reboot01.com/api/auth/signin";

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const user = document.getElementById("userOrEmail").value.trim();
  const pwd = document.getElementById("password").value;
  if (!user || !pwd) return showError("Both fields are required");

  const encoded = btoa(`${user}:${pwd}`);
  try {
    const res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encoded}`
      }
    });
    // …
    const payload = await res.json();
    const jwt = payload.token;
    // …
    localStorage.setItem("jwt", jwt);
    window.location.href = "profile.html";
  } catch {
    showError("Network error—try again");
  }
});

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
}
