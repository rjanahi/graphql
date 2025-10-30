// profile.js

let xpDataGlobal = [];
let cumulativeXP = 0;
let totalProject = 0;
let totalExercise = 0;

async function loadProfile() {
  const [userRes, auditRes] = await Promise.all([
    fetchGraphQL(`{ user { id login email firstName lastName } }`),
    fetchGraphQL(`{ user { auditRatio totalUp totalDown } }`)
  ]);

  const user = userRes.user[0];
  const auditUser = auditRes.user[0];

  document.getElementById("fullName").textContent = `Welcome, ${user.firstName} ${user.lastName}!`;
  document.getElementById("username").textContent = `#${user.login}`;



  drawDoneRecievedChart(auditUser.totalUp, auditUser.totalDown, auditUser.auditRatio);
  await drawXpTable();
  drawXpProgression();
}

function formatXp(amount) {
  if (amount < 1000) {
    return `${Math.round(amount)} B`;
  }
  const kb = amount / 1000;
  return kb >= 100 ? `${Math.round(kb)} kB` : `${kb.toFixed(1)} kB`;
}

async function drawXpTable() {
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
  const oldestDate = oldestResult.transaction[0]?.createdAt;
  console.log("Oldest Project Date:", oldestDate);

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

  const normalProjects = xpTableResult.transaction.map(tx => ({
    amount: tx.amount,
    createdAt: new Date(tx.createdAt),
    date: new Date(tx.createdAt).toLocaleDateString(),
    project: tx.object?.name || "Unnamed",
    type: tx.object?.type || "Untyped"
  }));
  console.log("Normal Projects:", normalProjects);

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

    checkpointProjects = checkpointResult.transaction.map(tx => ({
      amount: tx.amount,
      createdAt: new Date(tx.createdAt),
      date: new Date(tx.createdAt).toLocaleDateString(),
      project: tx.object?.name || "Unnamed",
      type: tx.object?.type || "Untyped"
    }));
  }

  const mergedData = [...normalProjects, ...checkpointProjects]
    .sort((a, b) => b.createdAt - a.createdAt);
  console.log("Merged XP Data:", mergedData);

  xpDataGlobal = mergedData;

  const data = mergedData;
  const tbody = document.querySelector("#xpTable tbody");
  tbody.innerHTML = "";
  data.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="padding:8px">${item.project}</td>
      <td style="padding:8px">${formatXp(item.amount)}</td>
      <td style="padding:8px">${item.date}</td>
    `;
    tbody.appendChild(row);
  });

  drawXpBarChart(data);
}

function drawXpBarChart(entries) {
  const svg = document.getElementById("xpBarChart");
  if (!svg) return;

  const legend = document.getElementById("xpBarLegend");
  const projectColor = "#007bff";
  const exerciseColor = "#a26cb8";
  const fallbackColor = "#607d8b";

  if (legend) {
    legend.innerHTML = `
      <span class="legend-item"><span class="legend-swatch" style="background:${projectColor}"></span>Project</span>
      <span class="legend-item"><span class="legend-swatch" style="background:${exerciseColor}"></span>Exercise</span>
      <span class="legend-item"><span class="legend-swatch" style="background:${fallbackColor}"></span>Other</span>
    `;
  }

  svg.innerHTML = "";

  if (!entries || entries.length === 0) {
    return;
  }

  const aggregated = new Map();
  entries.forEach((entry) => {
    const key = entry.project;
    const type = (entry.type || "other").toLowerCase();
    if (!aggregated.has(key)) {
      aggregated.set(key, { project: key, total: 0, type });
    }
    const record = aggregated.get(key);
    record.total += entry.amount;
    if (type !== "untyped" && type !== "other") {
      record.type = type;
    }
  });

  const data = Array.from(aggregated.values());
  if (!data.length) {
    return;
  }

  const width = Math.max(600, data.length * 80);
  const height = 360;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  const margin = { top: 20, right: 30, bottom: 120, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const step = chartWidth / data.length;

  const colorByType = {
    project: projectColor,
    piscine: projectColor,
    exercise: exerciseColor,
  };

  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const value = (maxValue / ticks) * i;
    const y =
      height - margin.bottom - (value / maxValue) * chartHeight;

    const gridLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    gridLine.setAttribute("x1", margin.left);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("x2", width - margin.right);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("stroke", "#333");
    gridLine.setAttribute("stroke-dasharray", "4 2");
    svg.appendChild(gridLine);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", margin.left - 12);
    label.setAttribute("y", y + 4);
    label.setAttribute("font-size", "12px");
    label.setAttribute("fill", "#ccc");
    label.setAttribute("text-anchor", "end");
    label.textContent = formatXp(value);
    svg.appendChild(label);
  }

  const axisX = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  axisX.setAttribute("x1", margin.left);
  axisX.setAttribute("y1", height - margin.bottom);
  axisX.setAttribute("x2", width - margin.right);
  axisX.setAttribute("y2", height - margin.bottom);
  axisX.setAttribute("stroke", "#555");
  svg.appendChild(axisX);

  const axisY = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  axisY.setAttribute("x1", margin.left);
  axisY.setAttribute("y1", margin.top);
  axisY.setAttribute("x2", margin.left);
  axisY.setAttribute("y2", height - margin.bottom);
  axisY.setAttribute("stroke", "#555");
  svg.appendChild(axisY);

  data.forEach((item, index) => {
    const barHeight = (item.total / maxValue) * chartHeight;
    const barWidth = step * 0.7;
    const x =
      margin.left + index * step + (step - barWidth) / 2;
    const y = height - margin.bottom - barHeight;
    const color = colorByType[item.type] || fallbackColor;

    const rect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", color);
    svg.appendChild(rect);

    const tooltip = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    tooltip.textContent = `${item.project}: ${formatXp(item.total)}`;
    rect.appendChild(tooltip);

    const valueText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    valueText.setAttribute("x", x + barWidth / 2);
    valueText.setAttribute("y", y - 6);
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("font-size", "12px");
    valueText.setAttribute("fill", "#ccc");
    valueText.textContent = formatXp(item.total);
    svg.appendChild(valueText);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    const labelX = margin.left + index * step + step / 2;
    const labelY = height - margin.bottom + 50;
    label.setAttribute("x", labelX);
    label.setAttribute("y", labelY);
    label.setAttribute("font-size", "12px");
    label.setAttribute("fill", "#ccc");
    label.setAttribute("text-anchor", "end");
    label.setAttribute(
      "transform",
      `rotate(-45 ${labelX} ${labelY})`
    );
    label.textContent = item.project;
    svg.appendChild(label);
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
    { label: "Received", value: received, color: "rgb(167, 84, 140)", arrow: "↓" },
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
    rect.setAttribute("x", 80);
    rect.setAttribute("y", y);
    rect.setAttribute("width", Math.round(item.value * barScale));
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", item.color);
    svg.appendChild(rect);

    // Value in kB
    const valueText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    valueText.setAttribute("x", width);
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
  if (ratioT > 1.1) {
    message = "Great job!"
  } else if (ratioT > 1.3) {
    message = "Looking good!"

  }

  ratioText.innerHTML = `
    <span style="font-size: 48px; color:rgb(255, 255, 255);">${roundedRatio}</span><br>
    <span style="color:rgb(255, 255, 255); font-size: 16px;">${message}</span>
  `;
}

function drawXpProgression() {
  const data = xpDataGlobal
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(entry => {
      cumulativeXP += entry.amount;
      if (entry.type === "project" || entry.type === "piscine") totalProject++;
      else if (entry.type === "exercise") totalExercise++;
      return { date: entry.date, total: cumulativeXP, createdAt: entry.createdAt };
    });

  document.getElementById("totalProjects").textContent = totalProject;
  document.getElementById("totalExcercises").textContent = totalExercise;

  const totalXP = data.at(-1)?.total || 0;
  document.getElementById("totalXp").textContent = `${(totalXP / 1000).toFixed(1)} KB`;

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
    label.setAttribute("x", padding );
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
      //M = moveto (move from one point to another point)
      pathD += `M ${x},${y}`;
    } else {
      const prevX = padding + (i - 1) * xScale;
      const prevY = height - padding - data[i - 1].total * yScale;
      const cx = (prevX + x) / 2;
      //Q = quadratic Bézier curve (create a quadratic Bézier curve)
      //T = smooth quadratic Bézier curveto (create a smooth quadratic Bézier curve)
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
  yAxis.setAttribute("x1", padding );
  yAxis.setAttribute("y1", padding);
  yAxis.setAttribute("x2", padding);
  yAxis.setAttribute("y2", height - padding);
  yAxis.setAttribute("stroke", "#333");
  svg.appendChild(yAxis);
}

function logout() {
  localStorage.removeItem("jwt");
  window.location.href = "index.html";
}

loadProfile();
