// profile.js

// Environment variable or default GraphQL endpoint
const GRAPHQL_URL = process.env.GRAPHQL_URL || "https://learn.reboot01.com/graphiql";

async function fetchGraphQL(query) {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No JWT found; user not signed in");

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error("GraphQL network error:", res.status, await res.text());
    throw new Error("GraphQL request failed");
  }

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error("GraphQL query returned errors");
  }
  return json;
}

let xpDataGlobal = []; // stored for table rendering

// Main profile loader
async function loadProfile() {
  // 1) Fetch oldest normal-project date
  const oldestResult = await fetchGraphQL(`{
    transaction(
      where: {
        _and: [
          { type: { _eq: "xp" } },
          { path: { _like: "/bahrain/bh-module/%" } },
          { path: { _nlike: "/bahrain/bh-module/checkpoint/%" } }
        ]
      },
      order_by: { createdAt: asc },
      limit: 1
    ) {
      createdAt
    }
  }`);
  const oldestDate = oldestResult.data.transaction[0]?.createdAt;
  console.log("Oldest Project Date:", oldestDate);

  // 2) Fetch all normal projects
  const xpTableResult = await fetchGraphQL(`{
    transaction(
      where: { 
        _and: [
          { type: { _eq: "xp" } },
          { path: { _like: "/bahrain/bh-module/%" } },
          { path: { _nlike: "/bahrain/bh-module/checkpoint/%" } },
          { path: { _nlike: "/bahrain/bh-module/piscine-js/%" } }
        ]
      }
    ) {
      amount
      createdAt
      object { name type }
    }
  }`);

  const normalProjects = xpTableResult.data.transaction.map(tx => ({
    amount: tx.amount,
    createdAt: new Date(tx.createdAt),
    date: new Date(tx.createdAt).toLocaleDateString(),
    project: tx.object?.name || "Unnamed",
    type: tx.object?.type || "Untyped"
  }));
  console.log("Normal Projects:", normalProjects);

  // 3) Fetch checkpoint projects after oldest date
  let checkpointProjects = [];
  if (oldestDate) {
    const checkpointResult = await fetchGraphQL(`{
      transaction(
        where: {
          _and: [
            { type: { _eq: "xp" } },
            { path: { _like: "/bahrain/bh-module/checkpoint/%" } },
            { createdAt: { _gt: "${oldestDate}" } }
          ]
        }
      ) {
        amount
        createdAt
        object { name type }
      }
    }`);

    checkpointProjects = checkpointResult.data.transaction.map(tx => ({
      amount: tx.amount,
      createdAt: new Date(tx.createdAt),
      date: new Date(tx.createdAt).toLocaleDateString(),
      project: tx.object?.name || "Unnamed",
      type: tx.object?.type || "Untyped"
    }));
  }

  // 4) Merge & sort
  const mergedData = [...normalProjects, ...checkpointProjects]
    .sort((a, b) => b.createdAt - a.createdAt);
  console.log("Merged XP Data:", mergedData);

  // 5) Fetch user & audit stats in parallel
  const [userRes, auditRes] = await Promise.all([
    fetchGraphQL(`{ user { id login email firstName lastName } }`),
    fetchGraphQL(`{ user { auditRatio totalUp totalDown } }`)
  ]);

  const user = userRes.data.user[0];
  const auditUser = auditRes.data.user[0];

  // 6) Calculate XP progression & counts
  let cumulativeXP = 0;
  let totalProject = 0;
  let totalExercise = 0;

  const xpProgressionData = mergedData
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(entry => {
      cumulativeXP += entry.amount;
      if (entry.type === "project" || entry.type === "piscine") totalProject++;
      else if (entry.type === "exercise") totalExercise++;
      return { date: entry.date, total: cumulativeXP, createdAt: entry.createdAt };
    });

  // 7) Update DOM
  document.getElementById("fullName").textContent = `Welcome, ${user.firstName} ${user.lastName}!`;
  document.getElementById("username").textContent = `#${user.login}`;
  document.getElementById("totalProjects").textContent = totalProject;
  document.getElementById("totalExcercises").textContent = totalExercise;
  const totalXP = xpProgressionData.at(-1)?.total || 0;
  document.getElementById("totalXp").textContent = `${(totalXP/1000).toFixed(1)} KB`;

  drawDoneReceivedChart(auditUser.totalUp, auditUser.totalDown, auditUser.auditRatio);
  drawXpTable(mergedData);
  drawXpProgression(xpProgressionData);
}

/** Table rendering **/
function drawXpTable(data) {
  xpDataGlobal = data;
  const tbody = document.querySelector("#xpTable tbody");
  tbody.innerHTML = "";
  data.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="padding:8px">${item.project}</td>
      <td style="padding:8px">${item.amount/1000 < 1 ? item.amount + ' B' : (item.amount/1000).toFixed(1) + ' kB'}</td>
      <td style="padding:8px">${item.date}</td>
    `;
    tbody.appendChild(row);
  });
}

function drawDoneRecievedChart(gave, received, ratioT) {
  const svg = document.getElementById("graph3");
  const ratioText = document.getElementById("ratio");
  const xOffset = 23;
  svg.innerHTML = "";

  const width = 400;
  const barHeight = 10;
  const gap = 40;
  const maxVal = Math.max(gave, received, 1);
  const barScale = 250 / maxVal;

  svg.setAttribute("width", width);
  svg.setAttribute("height", 2 * gap);

  const data = [
    { label: "Done", value: gave, color: "#007bff", arrow: "↑" },
    {
      label: "Received",
      value: received,
      color: "rgb(167, 84, 140)",
      arrow: "↓",
    },
  ];

  data.forEach((item, i) => {
    const y = i * gap;

    // Label
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", 0);
    label.setAttribute("y", y + barHeight + 5);
    label.setAttribute("fill", "#fff");
    label.setAttribute("font-size", "14px");
    label.setAttribute("font-family", "sans-serif");
    label.textContent = item.label;
    svg.appendChild(label);

    // Bar
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 100);
    rect.setAttribute("y", y);
    rect.setAttribute("width", item.value * barScale);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", item.color);
    svg.appendChild(rect);

    // Value in kB
    const valueText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    valueText.setAttribute("x", width - 10 + xOffset);
    valueText.setAttribute("y", y + barHeight + 5);
    valueText.setAttribute("fill", "#fff");
    valueText.setAttribute("font-size", "14px");
    valueText.setAttribute("font-family", "monospace");
    valueText.setAttribute("text-anchor", "end");
    const kb = Math.round(item.value / 1000);
    valueText.textContent = `${kb} kB ${item.arrow}`;
    svg.appendChild(valueText);
  });

  // Ratio Text
  const roundedRatio = (ratioT || 0).toFixed(1);
  let message = "You can do better!";
  if (ratioT > 1.3) message = "Great job!";
  else if (ratioT > 1.1) message = "Looking good!";

  ratioText.innerHTML = `
    <span style="font-size: 48px; color:rgb(255, 255, 255);">${roundedRatio}</span><br>
    <span style="color:rgb(255, 255, 255); font-size: 16px;">${message}</span>
  `;
}

function drawXpProgression(data) {
  const svg = document.getElementById("graph2");
  svg.innerHTML = "";

  const width = 700;
  const height = 300;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  const padding = 50;

  const maxXP = Math.max(...data.map((d) => d.total));
  const xScale = (width - 2 * padding) / (data.length - 1);
  const yScale = (height - 2 * padding) / maxXP;

  // Gridlines & Labels
  for (let i = 0; i <= 5; i++) {
    const yVal = (maxXP / 5) * i;
    const y = height - padding - yVal * yScale;

    // Grid line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - padding);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#ccc");
    line.setAttribute("stroke-dasharray", "4 2");
    svg.appendChild(line);

    // Y axis label
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", padding - 10);
    label.setAttribute("y", y + 5);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "12px");
    label.setAttribute("fill", "#fff");
    label.textContent = `${(yVal / 1000).toFixed(1)} kB`;
    svg.appendChild(label);
  }

  // X axis date labels
  const dateInterval = Math.ceil(data.length / 6);
  data.forEach((d, i) => {
    if (i % dateInterval !== 0) return;
    const x = padding + i * xScale;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", height - padding + 20);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "12px");
    text.setAttribute("fill", "#555");
    text.textContent = d.date;
    svg.appendChild(text);
  });

  // Line path (smooth curve)
  let pathD = "";
  for (let i = 0; i < data.length; i++) {
    const x = padding + i * xScale;
    const y = height - padding - data[i].total * yScale;
    if (i === 0) {
      pathD += `M ${x},${y}`;
    } else {
      const prevX = padding + (i - 1) * xScale;
      const prevY = height - padding - data[i - 1].total * yScale;
      const cx = (prevX + x) / 2;
      pathD += ` Q ${prevX},${prevY} ${cx},${(prevY + y) / 2}`;
      pathD += ` T ${x},${y}`;
    }
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("stroke", "#2196f3");
  path.setAttribute("stroke-width", 2.5);
  path.setAttribute("fill", "none");
  svg.appendChild(path);

  // Points (dots) with tooltip
  data.forEach((d, i) => {
    const x = padding + i * xScale;
    const y = height - padding - d.total * yScale;

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 4);
    circle.setAttribute("fill", "#a26cb8");
    svg.appendChild(circle);

    const tooltip = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    tooltip.textContent = `${d.date}: ${(d.total / 1000).toFixed(1)} kB`;
    circle.appendChild(tooltip);
  });

  // X axis line
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", padding);
  xAxis.setAttribute("y1", height - padding);
  xAxis.setAttribute("x2", width - padding);
  xAxis.setAttribute("y2", height - padding);
  xAxis.setAttribute("stroke", "#333");
  svg.appendChild(xAxis);

  // Y axis line
  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", padding);
  yAxis.setAttribute("y1", padding);
  yAxis.setAttribute("x2", padding);
  yAxis.setAttribute("y2", height - padding);
  yAxis.setAttribute("stroke", "#333");
  svg.appendChild(yAxis);
}

function logout() {
  localStorage.removeItem("jwt");
  window.location.href = "/index.html";
}

loadProfile();