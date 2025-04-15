document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
  
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
  
      if (res.ok && data.token) {
        localStorage.setItem("jwt", data.token);
        window.location.href = "/profile.html";
      } else {
        document.getElementById("errorMsg").textContent = data.error || "Login failed.";
      }
    } catch (err) {
      console.error("Login error:", err);
      document.getElementById("errorMsg").textContent = "Unexpected error. Try again.";
    }
  });
  