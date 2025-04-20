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
  const userQuery = `{
    user {
      id
      login
    }
  }`;

  const xpQuery = ` {
    transaction(
      where: {
        _and: [
          { type: { _eq: "xp" } },
          { path: { _like: "/bahrain/bh-module/%" } },
          { path: { _nlike: "/bahrain/bh-module/piscine-js/%" } }
        ]
      },
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      object {
        name
      }
    }
  }`;

  const xpTableQuery = `{
    transaction(
      where: {
        type: { _eq: "xp" },
        path: { _like: "/bahrain/bh-module/%" }
      },
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      object {
        name
      }
    }
  }`;

  const auditRatioQuery = `{
    user {
      auditRatio
      totalUp
      totalDown
    }
  }`;

  const userData = await fetchData(userQuery);
  const auditData = await fetchData(auditRatioQuery);
  const xpResult = await fetchData(xpTableQuery);
  const xpResult2 = await fetchData(xpQuery);


  // Map XP transactions into format expected by drawGraphs()
  const xpData = xpResult.data.transaction
  .map((tx) => ({
    amount: tx.amount,
    date: new Date(tx.createdAt).toLocaleDateString(),
    createdAt: new Date(tx.createdAt), // keep raw date for sorting
    project: tx.object?.name || "Unnamed"
  }))
  .sort((a, b) => b.createdAt - a.createdAt); // sort ascending

  const xpData2 = xpResult2.data.transaction
  .map((tx) => ({
    amount: tx.amount,
    date: new Date(tx.createdAt).toLocaleDateString(),
    createdAt: new Date(tx.createdAt), // keep raw date for sorting
    project: tx.object?.name || "Unnamed"
  }))

  const xpProgressionData = [];
  let cumulativeXP = 0;
  
  xpData2.forEach((entry) => {
    cumulativeXP += entry.amount;
    xpProgressionData.push({
      date: entry.date,
      total: cumulativeXP,
      createdAt: entry.createdAt  // store raw date
    });
  });
  
  const sorted = xpProgressionData.sort((a, b) => a.total - b.total);

  const user = userData.data.user[0];
  document.getElementById(
    "userInfo"
  ).innerText = `ID: ${user.id}, Login: ${user.login}`;

  const auditUser = auditData.data.user[0];

  const totalUp = auditUser.totalUp || 0;
  const totalDown = auditUser.totalDown || 0;
  const totalRatio = auditUser.auditRatio || 0;

  console.log("Total Up:", totalUp);
  console.log("Total Down:", totalDown);

  drawDoneRecievedChart(totalUp, totalDown, totalRatio);
  drawXpTable(xpData);
  drawXpProgression(sorted);
}

// function drawGraphs(xpData) {
//   const svg1 = document.getElementById("graph1");
//   svg1.innerHTML = "";

//   const amounts = xpData.map((d) => d.amount);
//   const maxAmount = Math.max(...amounts);
//   const maxLog = Math.log10(maxAmount + 1);

//   const svgHeight = 300;
//   svg1.setAttribute("height", svgHeight);
//   const barWidth = 20;
//   const barSpacing = 5;
//   const svgWidth = xpData.length * (barWidth + barSpacing);
//   svg1.setAttribute("width", svgWidth);

//   const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
//   xAxis.setAttribute("x1", 0);
//   xAxis.setAttribute("y1", svgHeight);
//   xAxis.setAttribute("x2", svgWidth);
//   xAxis.setAttribute("y2", svgHeight);
//   xAxis.setAttribute("stroke", "black");
//   svg1.appendChild(xAxis);

//   const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
//   yAxis.setAttribute("x1", 0);
//   yAxis.setAttribute("y1", 0);
//   yAxis.setAttribute("x2", 0);
//   yAxis.setAttribute("y2", svgHeight);
//   yAxis.setAttribute("stroke", "black");
//   svg1.appendChild(yAxis);

//   xpData.forEach((data, index) => {
//     const logAmount = Math.log10(data.amount + 1);
//     const barHeight = (logAmount / maxLog) * svgHeight;

//     const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//     rect.setAttribute("x", index * (barWidth + barSpacing));
//     rect.setAttribute("y", svgHeight - barHeight);
//     rect.setAttribute("width", barWidth);
//     rect.setAttribute("height", barHeight);
//     rect.setAttribute("fill", "steelblue");

//     // Tooltip title
//     const tooltip = document.createElementNS(
//       "http://www.w3.org/2000/svg",
//       "title"
//     );
//     tooltip.textContent = `XP: ${data.amount} on ${data.date}`;
//     rect.appendChild(tooltip);

//     // Hover behavior
//     rect.addEventListener("mouseover", () => {
//       rect.setAttribute("fill", "orange");

//       const hoverText = document.createElementNS(
//         "http://www.w3.org/2000/svg",
//         "text"
//       );
//       hoverText.setAttribute("class", "hover-text");
//       hoverText.setAttribute(
//         "x",
//         index * (barWidth + barSpacing) + barWidth / 2
//       );
//       hoverText.setAttribute("y", svgHeight - barHeight - 10);
//       hoverText.setAttribute("font-size", "14");
//       hoverText.setAttribute("text-anchor", "middle");
//       hoverText.setAttribute("fill", "black");
//       hoverText.textContent = Math.round(data.amount);

//       svg1.appendChild(hoverText);
//     });

//     rect.addEventListener("mouseout", () => {
//       rect.setAttribute("fill", "steelblue");
//       const text = svg1.querySelector("text.hover-text");
//       if (text) svg1.removeChild(text);
//     });

//     svg1.appendChild(rect);
//   });
// }

function drawXpTable(data) {
  const tbody = document.getElementById("xpTable").querySelector("tbody");
  tbody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");

    const projectCell = document.createElement("td");
    projectCell.textContent = item.project || "Unknown";
    projectCell.style.padding = "8px";

    const xpCell = document.createElement("td");
    const kb = (item.amount / 1000).toFixed(1);
    xpCell.textContent = `${kb} kB`;
    xpCell.style.padding = "8px";

    const dateCell = document.createElement("td");
    dateCell.textContent = item.date;
    dateCell.style.padding = "8px";

    row.appendChild(projectCell);
    row.appendChild(xpCell);
    row.appendChild(dateCell);
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
    { label: "Done", value: gave, color: "#4caf50", arrow: "↑" },
    { label: "Received", value: received, color: "#f44336", arrow: "↓" },
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
    label.setAttribute("fill", "#000000");
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
    valueText.setAttribute("fill", "#000000");
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
    <span style="font-size: 48px; color: #f0c000;">${roundedRatio}</span><br>
    <span style="color: #f0c000; font-size: 16px;">${message}</span>
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

  const maxXP = Math.max(...data.map(d => d.total));
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
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", padding - 10);
    label.setAttribute("y", y + 5);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "12px");
    label.setAttribute("fill", "#555");
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

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 4);
    circle.setAttribute("fill", "#ff9800");
    svg.appendChild(circle);

    const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
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
