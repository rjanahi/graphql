async function fetchData(query) {
    const token = localStorage.getItem("jwt");
  
    const res = await fetch("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ query }),
    });
  
    return await res.json();
  }
  
  async function loadProfile() {
    const query = `
    {
      user {
        id
        login
      }
    }`;
  
    const data = await fetchData(query);
    const user = data.data.user[0];
    document.getElementById("userInfo").innerText = `ID: ${user.id}, Login: ${user.login}`;
  
    drawGraphs();
  }
  
  function drawGraphs() {
    const svg1 = document.getElementById("graph1");
    for (let i = 0; i < 10; i++) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", i * 50);
      rect.setAttribute("y", 200 - i * 10);
      rect.setAttribute("width", 40);
      rect.setAttribute("height", i * 10);
      rect.setAttribute("fill", "steelblue");
      svg1.appendChild(rect);
    }
  
    const svg2 = document.getElementById("graph2");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", 100);
    circle.setAttribute("cy", 100);
    circle.setAttribute("r", 60);
    circle.setAttribute("fill", "tomato");
    svg2.appendChild(circle);
  }
  
  function logout() {
    localStorage.removeItem("jwt");
    window.location.href = "/index.html";
  }
  
  loadProfile();
  