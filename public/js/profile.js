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

  const xpQuery = `{
    transaction(where: {type: {_eq: "xp"}}) {
      amount
      createdAt
      path
    }
  }`;

  const skillMap = {
    "Prog": 0,
    "Go": 0,
    "JS": 0,
    "HTML": 0,
    "Front-End": 0,
    "Back-End": 0,
  };

  const resultQuery = `{
    passed: result_aggregate(where: {grade: {_eq: 1}}) {
      aggregate {
        count
      }
    }
    failed: result_aggregate(where: {grade: {_eq: 0}}) {
      aggregate {
        count
      }
    }
  }`;

  const userData = await fetchData(userQuery);
  const xpData = await fetchData(xpQuery);
  const resultData = await fetchData(resultQuery);

  const user = userData.data.user[0];
  document.getElementById("userInfo").innerText = `ID: ${user.id}, Login: ${user.login}`;

  const processedXPData = xpData.data.transaction
    .filter(tx => tx.amount > 0)
    .map(tx => ({
      amount: tx.amount,
      date: new Date(tx.createdAt).toLocaleDateString()
    }));

    const allPaths = xpData.data.transaction.map(tx => tx.path);
const uniquePaths = [...new Set(allPaths)];
console.log("📂 Unique Paths in XP:", uniquePaths);

  // Assign XP to skillMap using better keyword matching
  xpData.data.transaction.forEach(tx => {
    const path = tx.path.toLowerCase();
    const amount = tx.amount;
  
    if (
      path.includes("/bh-piscine/quest-") ||
      path.includes("/bh-piscine/checkpoint-") ||
      path.includes("piscine-go") ||
      path.includes("quest-01")
    ) {
      skillMap["Go"] += amount;
    } else if (
      path.includes("ascii-art") ||
      path.includes("stylize") ||
      path.includes("fs")
    ) {
      skillMap["JS"] += amount;
    } else if (
      path.includes("groupie-tracker") ||
      path.includes("net-cat")
    ) {
      skillMap["Back-End"] += amount;
    } else if (
      path.includes("output") ||
      path.includes("exportfile") ||
      path.includes("visualizations")
    ) {
      skillMap["Front-End"] += amount;
    } else if (
      path.includes("printalphabet") ||
      path.includes("toupper") ||
      path.includes("tolower") ||
      path.includes("isupper") ||
      path.includes("islower") ||
      path.includes("capitalize")
    ) {
      skillMap["HTML"] += amount;
    } else {
      skillMap["Prog"] += amount;
    }
  });
  

  // Show debugging info
  console.log("SkillMap breakdown:", skillMap);

  // Normalize to percentage
  const maxXP = Math.max(...Object.values(skillMap));
  const userSkills = Object.entries(skillMap).map(([name, xp]) => ({
    name,
    percent: maxXP > 0 ? Math.round((xp / maxXP) * 100) : 0
  }));

  console.log("Radar Chart Data:", userSkills);
  

  const passCount = resultData.data.passed.aggregate.count;
  const failCount = resultData.data.failed.aggregate.count;
  
  
  drawGraphs(processedXPData);
  drawRadarChart(userSkills);
  // Now feed to a pie, bar, or horizontal bar chart
  drawPassFailChart(passCount, failCount);
}


function drawGraphs(xpData) {
  const svg1 = document.getElementById("graph1");
  svg1.innerHTML = '';

  const amounts = xpData.map(d => d.amount);
  const maxAmount = Math.max(...amounts);
  const maxLog = Math.log10(maxAmount + 1);

  const svgHeight = 300;
  svg1.setAttribute("height", svgHeight);
  const barWidth = 20;
  const barSpacing = 5;
  const svgWidth = xpData.length * (barWidth + barSpacing);
  svg1.setAttribute("width", svgWidth);

  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", 0);
  xAxis.setAttribute("y1", svgHeight);
  xAxis.setAttribute("x2", svgWidth);
  xAxis.setAttribute("y2", svgHeight);
  xAxis.setAttribute("stroke", "black");
  svg1.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", 0);
  yAxis.setAttribute("y1", 0);
  yAxis.setAttribute("x2", 0);
  yAxis.setAttribute("y2", svgHeight);
  yAxis.setAttribute("stroke", "black");
  svg1.appendChild(yAxis);

  xpData.forEach((data, index) => {
    const logAmount = Math.log10(data.amount + 1);
    const barHeight = (logAmount / maxLog) * svgHeight;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", index * (barWidth + barSpacing));
    rect.setAttribute("y", svgHeight - barHeight);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", "steelblue");

    // Tooltip title
    const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tooltip.textContent = `XP: ${data.amount} on ${data.date}`;
    rect.appendChild(tooltip);

    // Hover behavior
    rect.addEventListener("mouseover", () => {
      rect.setAttribute("fill", "orange");

      const hoverText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      hoverText.setAttribute("class", "hover-text");
      hoverText.setAttribute("x", index * (barWidth + barSpacing) + barWidth / 2);
      hoverText.setAttribute("y", svgHeight - barHeight - 10);
      hoverText.setAttribute("font-size", "14");
      hoverText.setAttribute("text-anchor", "middle");
      hoverText.setAttribute("fill", "black");
      hoverText.textContent = Math.round(data.amount);

      svg1.appendChild(hoverText);
    });

    rect.addEventListener("mouseout", () => {
      rect.setAttribute("fill", "steelblue");
      const text = svg1.querySelector("text.hover-text");
      if (text) svg1.removeChild(text);
    });

    svg1.appendChild(rect);
  });
}

// //multi circles
// function drawSkillCircles(skills) {
//   const svg2 = document.getElementById("graph2");
//   svg2.innerHTML = '';

//   const radius = 40;
//   const strokeWidth = 8;
//   const fullCirc = 2 * Math.PI * radius;
//   const svgHeight = 120;
//   const spacing = 120;
//   const svgWidth = skills.length * spacing;

//   svg2.setAttribute("height", svgHeight);
//   svg2.setAttribute("width", svgWidth);

//   skills.forEach((skill, i) => {
//     const centerX = i * spacing + radius + 20;
//     const centerY = svgHeight / 2;

//     const percent = skill.percent;
//     const offset = fullCirc * (1 - percent / 100);

//     // Background circle
//     const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
//     bgCircle.setAttribute("cx", centerX);
//     bgCircle.setAttribute("cy", centerY);
//     bgCircle.setAttribute("r", radius);
//     bgCircle.setAttribute("stroke", "#eee");
//     bgCircle.setAttribute("stroke-width", strokeWidth);
//     bgCircle.setAttribute("fill", "none");
//     svg2.appendChild(bgCircle);

//     // Progress circle
//     const fgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
//     fgCircle.setAttribute("cx", centerX);
//     fgCircle.setAttribute("cy", centerY);
//     fgCircle.setAttribute("r", radius);
//     fgCircle.setAttribute("stroke", "#28a745");
//     fgCircle.setAttribute("stroke-width", strokeWidth);
//     fgCircle.setAttribute("fill", "none");
//     fgCircle.setAttribute("stroke-dasharray", fullCirc);
//     fgCircle.setAttribute("stroke-dashoffset", offset);
//     fgCircle.setAttribute("transform", `rotate(-90 ${centerX} ${centerY})`);
//     svg2.appendChild(fgCircle);

//     // Percent Text
//     const percentText = document.createElementNS("http://www.w3.org/2000/svg", "text");
//     percentText.setAttribute("x", centerX);
//     percentText.setAttribute("y", centerY + 5);
//     percentText.setAttribute("text-anchor", "middle");
//     percentText.setAttribute("font-size", "16");
//     percentText.setAttribute("fill", "#333");
//     percentText.textContent = `${percent}%`;
//     svg2.appendChild(percentText);

//     // Skill Label
//     const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
//     label.setAttribute("x", centerX);
//     label.setAttribute("y", centerY + radius + 20);
//     label.setAttribute("text-anchor", "middle");
//     label.setAttribute("font-size", "12");
//     label.textContent = skill.name;
//     svg2.appendChild(label);
//   });
// }

//radar chart
function drawRadarChart(skills) {
  const svg = document.getElementById("graph2");
  svg.innerHTML = "";

  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 30;
  const levels = 5;
  const angleStep = (2 * Math.PI) / skills.length;

  svg.setAttribute("width", size);
  svg.setAttribute("height", size);

  // Draw concentric circles
  for (let level = 1; level <= levels; level++) {
    const r = (radius / levels) * level;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#ccc");
    circle.setAttribute("stroke-width", "0.5");
    svg.appendChild(circle);
  }

  // Draw axes and labels
  skills.forEach((skill, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);

    // Axis line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", center);
    line.setAttribute("y1", center);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#ccc");
    line.setAttribute("stroke-width", "0.5");
    svg.appendChild(line);

    // Label
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "12");
    label.textContent = skill.name;
    svg.appendChild(label);
  });

  // Draw skill area polygon
  const points = skills.map((skill, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const skillRadius = (skill.percent / 100) * radius;
    const x = center + skillRadius * Math.cos(angle);
    const y = center + skillRadius * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", points);
  polygon.setAttribute("fill", "rgba(128, 0, 255, 0.4)");
  polygon.setAttribute("stroke", "#8000ff");
  polygon.setAttribute("stroke-width", "1");
  svg.appendChild(polygon);
}

//Pie chart
// function drawPieChart(skills) {
//   const svg = document.getElementById("graph2");
//   svg.innerHTML = "";

//   const radius = 100;
//   const center = 150;
//   const svgSize = 300;

//   svg.setAttribute("width", svgSize);
//   svg.setAttribute("height", svgSize);

//   const total = skills.reduce((sum, skill) => sum + skill.percent, 0);
//   let angleOffset = -90;

//   skills.forEach((skill, i) => {
//     const angle = (skill.percent / total) * 360;
//     const largeArc = angle > 180 ? 1 : 0;
//     const x1 = center + radius * Math.cos((Math.PI / 180) * angleOffset);
//     const y1 = center + radius * Math.sin((Math.PI / 180) * angleOffset);
//     angleOffset += angle;
//     const x2 = center + radius * Math.cos((Math.PI / 180) * angleOffset);
//     const y2 = center + radius * Math.sin((Math.PI / 180) * angleOffset);

//     const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
//     const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
//     path.setAttribute("d", d);
//     path.setAttribute("fill", getColor(i));
//     svg.appendChild(path);
//   });

//   // Optional: add labels
//   skills.forEach((skill, i) => {
//     const midAngle = (skills.slice(0, i).reduce((a, s) => a + s.percent, 0) + skill.percent / 2) / total * 2 * Math.PI - Math.PI / 2;
//     const x = center + (radius + 20) * Math.cos(midAngle);
//     const y = center + (radius + 20) * Math.sin(midAngle);
//     const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
//     label.setAttribute("x", x);
//     label.setAttribute("y", y);
//     label.setAttribute("font-size", "12");
//     label.setAttribute("text-anchor", "middle");
//     label.textContent = skill.name;
//     svg.appendChild(label);
//   });

//   function getColor(index) {
//     const colors = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#f44336", "#00bcd4"];
//     return colors[index % colors.length];
//   }
// }

function drawPassFailChart(passCount, failCount) {
  const svg = document.getElementById("graph3");
  svg.innerHTML = "";

  const width = 400;
  const barHeight = 30;
  const gap = 20;
  const maxCount = Math.max(passCount, failCount);
  const barScale = 300 / maxCount;

  svg.setAttribute("width", width);
  svg.setAttribute("height", 2 * (barHeight + gap));

  const data = [
    { label: "PASS", value: passCount, color: "#4caf50" },
    { label: "FAIL", value: failCount, color: "#f44336" }
  ];

  data.forEach((item, i) => {
    const y = i * (barHeight + gap);

    // Bar
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 100);
    rect.setAttribute("y", y);
    rect.setAttribute("width", item.value * barScale);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", item.color);
    svg.appendChild(rect);

    // Label
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", 0);
    label.setAttribute("y", y + barHeight / 1.5);
    label.setAttribute("fill", "#333");
    label.setAttribute("font-size", "14");
    label.textContent = item.label;
    svg.appendChild(label);

    // Value
    const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valueText.setAttribute("x", 105 + item.value * barScale);
    valueText.setAttribute("y", y + barHeight / 1.5);
    valueText.setAttribute("fill", "#000");
    valueText.setAttribute("font-size", "14");
    valueText.textContent = item.value;
    svg.appendChild(valueText);
  });
}


function logout() {
  localStorage.removeItem("jwt");
  window.location.href = "/index.html";
}

loadProfile();
