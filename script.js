// --- SVG setup ---
const svg = document.getElementById("graph");
const svgWidth = 600;
const svgHeight = 400;
const padding = 50;

// --- Unit conversion (weights are always stored in kg) ---
const KG_TO_LBS = 2.20462;

function getUnit() {
    return localStorage.getItem("weightUnit") || "kg";
}

function roundTo1(value) {
    return Math.round(value * 10) / 10;
}

function convertToUnit(kg) {
    return getUnit() === "lbs" ? kg * KG_TO_LBS : kg;
}

function convertFromUnit(value) {
    return getUnit() === "lbs" ? value / KG_TO_LBS : value;
}

function toDisplayWeight(kg) {
    return roundTo1(convertToUnit(kg));
}

function getDateFormat() {
    return localStorage.getItem("weightDateFormat") || "dd.mm.yyyy";
}

function formatDate(isoDate) {
    const [year, month, day] = isoDate.split("-");

    if (getDateFormat() === "mm/dd/yyyy") {
        return `${month}/${day}/${year}`;
    }

    if (getDateFormat() === "yyyy-mm-dd") {
        return `${year}-${month}-${day}`;
    }

    return `${day}.${month}.${year}`;
}

function getMovingAveragesWindow() {
    const stored = Number(localStorage.getItem("weightMovingAveragesWindow"));
    return stored > 0 ? stored : 5;
}

// --- Month navigation state ---
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const monthLabel = document.getElementById("monthLabel");
const monthStats = document.getElementById("monthStats");

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

function updateMonthLabel() {
    monthLabel.textContent = new Date(currentYear, currentMonth, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function updateMonthStats(monthEntries) {
    monthStats.classList.remove("stats-gain", "stats-loss");

    if (monthEntries.length < 2) {
        monthStats.textContent = "";
        return;
    }

    const unit = getUnit();
    const change = roundTo1(
        convertToUnit(monthEntries[monthEntries.length - 1].weight) - convertToUnit(monthEntries[0].weight)
    );

    if (change === 0) {
        monthStats.textContent = "No change this month";
    } else if (change > 0) {
        monthStats.textContent = `Gained ${change} ${unit} this month`;
        monthStats.classList.add("stats-gain");
    } else {
        monthStats.textContent = `Lost ${Math.abs(change)} ${unit} this month`;
        monthStats.classList.add("stats-loss");
    }
}

function getEntriesForCurrentMonth() {
    return entries.filter(entry => {
        const d = new Date(entry.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
}

function getMovingAverages(monthEntries) {
    const windowSize = getMovingAveragesWindow();
    const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    return monthEntries.map(entry => {
        const index = chronological.indexOf(entry);
        const window = chronological.slice(Math.max(0, index - windowSize + 1), index + 1);
        return window.reduce((sum, e) => sum + e.weight, 0) / window.length;
    });
}

function drawGraph() {
    svg.innerHTML = "";

    const monthEntries = getEntriesForCurrentMonth().sort((a, b) => a.date.localeCompare(b.date));

    updateMonthStats(monthEntries);

    if (monthEntries.length === 0) return;

    const unit = getUnit();
    const goalWeightKg = getGoalWeight();
    const goalWeight = goalWeightKg === null ? null : toDisplayWeight(goalWeightKg);
    const weights = monthEntries.map(entry => toDisplayWeight(entry.weight));
    const movingAverages = getMovingAverages(monthEntries).map(toDisplayWeight);
    const valuesForRange = goalWeight === null
        ? [...weights, ...movingAverages]
        : [...weights, ...movingAverages, goalWeight];
    const minWeight = Math.min(...valuesForRange);
    const maxWeight = Math.max(...valuesForRange);

    // --- Draw grid lines + labels (fixed step size) ---
    const gridStep = 5;

    const gridMin = Math.floor(minWeight / gridStep) * gridStep;
    const gridMax = Math.ceil(maxWeight / gridStep) * gridStep;
    const gridRange = gridMax - gridMin;

    for (let value = gridMin; value <= gridMax; value += gridStep) {
        const y = gridRange === 0
            ? svgHeight / 2
            : svgHeight - padding - ((value - gridMin) / gridRange) * (svgHeight - padding * 2);

        const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        gridLine.setAttribute("x1", padding);
        gridLine.setAttribute("x2", svgWidth - padding);
        gridLine.setAttribute("y1", y);
        gridLine.setAttribute("y2", y);
        gridLine.setAttribute("stroke", "#ddd");
        gridLine.setAttribute("stroke-width", "1");
        svg.appendChild(gridLine);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", padding - 8);
        label.setAttribute("y", y + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", "12");
        label.setAttribute("fill", "#666");
        label.textContent = `${value} ${unit}`;
        svg.appendChild(label);
    }

    // --- Vertical grid lines + day labels (spaced across the month, not every day) ---
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayGridStep = 5;

    const dayToX = day => daysInMonth === 1
        ? svgWidth / 2
        : padding + ((day - 1) / (daysInMonth - 1)) * (svgWidth - padding * 2);

    for (let day = 1; day <= daysInMonth; day += dayGridStep) {
        const x = dayToX(day);

        const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        gridLine.setAttribute("x1", x);
        gridLine.setAttribute("x2", x);
        gridLine.setAttribute("y1", padding);
        gridLine.setAttribute("y2", svgHeight - padding);
        gridLine.setAttribute("stroke", "#ddd");
        gridLine.setAttribute("stroke-width", "1");
        svg.appendChild(gridLine);

        const dayLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        dayLabel.setAttribute("x", x);
        dayLabel.setAttribute("y", svgHeight - padding + 20);
        dayLabel.setAttribute("text-anchor", "middle");
        dayLabel.setAttribute("font-size", "10");
        dayLabel.setAttribute("fill", "#666");
        dayLabel.textContent = day;
        svg.appendChild(dayLabel);
    }

    // --- Goal weight line (dashed, horizontal) ---
    if (goalWeight !== null) {
        const goalY = gridRange === 0
            ? svgHeight / 2
            : svgHeight - padding - ((goalWeight - gridMin) / gridRange) * (svgHeight - padding * 2);

        const goalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        goalLine.setAttribute("x1", padding);
        goalLine.setAttribute("x2", svgWidth - padding);
        goalLine.setAttribute("y1", goalY);
        goalLine.setAttribute("y2", goalY);
        goalLine.setAttribute("stroke", "green");
        goalLine.setAttribute("stroke-width", "2");
        goalLine.setAttribute("stroke-dasharray", "6,4");
        svg.appendChild(goalLine);

        const goalLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        goalLabel.setAttribute("x", padding + 4);
        goalLabel.setAttribute("y", goalY - 6);
        goalLabel.setAttribute("font-size", "11");
        goalLabel.setAttribute("fill", "green");
        goalLabel.textContent = `Goal: ${goalWeight} ${unit}`;
        svg.appendChild(goalLabel);
    }

    // --- Moving average line ---
    if (monthEntries.length > 1) {
        const averagePoints = monthEntries.map((entry, index) => {
            const day = new Date(entry.date).getDate();
            const x = dayToX(day);

            const y = gridRange === 0
                ? svgHeight / 2
                : svgHeight - padding - ((movingAverages[index] - gridMin) / gridRange) * (svgHeight - padding * 2);

            return `${x},${y}`;
        }).join(" ");

        const averageLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        averageLine.setAttribute("points", averagePoints);
        averageLine.setAttribute("fill", "none");
        averageLine.setAttribute("stroke", "orange");
        averageLine.setAttribute("stroke-width", "2");
        svg.appendChild(averageLine);
    }

    // --- Points and connecting line (spaced by day of month) ---
    const points = monthEntries.map((entry, index) => {
        const day = new Date(entry.date).getDate();

        const x = dayToX(day);

        const y = gridRange === 0
            ? svgHeight / 2
            : svgHeight - padding - ((weights[index] - gridMin) / gridRange) * (svgHeight - padding * 2);

        return { x, y };
    });

    const pointsString = points.map(p => `${p.x},${p.y}`).join(" ");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", pointsString);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "darkgrey");
    polyline.setAttribute("stroke-width", "2");
    svg.appendChild(polyline);

    // --- Dots (hover tooltip shows exact date + weight, click opens edit/delete popup) ---
    points.forEach((p, index) => {
        const entry = monthEntries[index];

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", p.x);
        circle.setAttribute("cy", p.y);
        circle.setAttribute("r", "5");
        circle.setAttribute("fill", "blue");
        circle.style.cursor = "pointer";

        const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
        tooltip.textContent = `${formatDate(entry.date)}: ${weights[index]} ${unit}`;
        circle.appendChild(tooltip);

        circle.addEventListener("click", function(event) {
            event.stopPropagation();
            openPopup(entry, event.clientX, event.clientY);
        });

        svg.appendChild(circle);
    });
}

// --- Load saved entries ---
let entries = [];

const savedEntries = localStorage.getItem("weightEntries");

if (savedEntries !== null) {
    entries = JSON.parse(savedEntries);
}

// --- Weight input placeholder (shows the most recently logged weight) ---
const weightInput = document.getElementById("weightInput");

function updateWeightPlaceholder() {
    if (entries.length === 0) {
        weightInput.placeholder = "";
        return;
    }

    const latestEntry = entries.reduce((latest, entry) => entry.date > latest.date ? entry : latest);
    weightInput.placeholder = toDisplayWeight(latestEntry.weight);
}

function saveEntries() {
    localStorage.setItem("weightEntries", JSON.stringify(entries));
}

// --- Point edit/delete popup ---
const entryPopup = document.getElementById("entryPopup");
const popupForm = document.getElementById("popupForm");
const popupDateInput = document.getElementById("popupDate");
const popupWeightInput = document.getElementById("popupWeight");
const popupDeleteBtn = document.getElementById("popupDelete");
const popupCloseBtn = document.getElementById("popupClose");

let popupEntry = null;

function openPopup(entry, clientX, clientY) {
    popupEntry = entry;
    popupDateInput.value = entry.date;
    popupWeightInput.value = toDisplayWeight(entry.weight);

    entryPopup.classList.remove("hidden");

    const rect = entryPopup.getBoundingClientRect();
    const left = Math.min(clientX + 12, window.innerWidth - rect.width - 12);
    const top = Math.min(clientY + 12, window.innerHeight - rect.height - 12);

    entryPopup.style.left = `${Math.max(12, left)}px`;
    entryPopup.style.top = `${Math.max(12, top)}px`;
}

function closePopup() {
    popupEntry = null;
    entryPopup.classList.add("hidden");
}

popupForm.addEventListener("submit", function(event) {
    event.preventDefault();

    if (!popupEntry) return;

    popupEntry.date = popupDateInput.value;
    popupEntry.weight = convertFromUnit(Number(popupWeightInput.value));

    saveEntries();

    const entryDate = new Date(popupEntry.date);
    currentYear = entryDate.getFullYear();
    currentMonth = entryDate.getMonth();

    closePopup();
    updateMonthLabel();
    updateWeightPlaceholder();
    drawGraph();
});

popupDeleteBtn.addEventListener("click", function() {
    if (!popupEntry) return;

    if (!confirm(`Delete the entry for ${popupEntry.date}?`)) {
        return;
    }

    entries.splice(entries.indexOf(popupEntry), 1);

    saveEntries();
    closePopup();
    updateWeightPlaceholder();
    drawGraph();
});

popupCloseBtn.addEventListener("click", closePopup);

document.addEventListener("click", function(event) {
    if (!entryPopup.classList.contains("hidden") && !entryPopup.contains(event.target)) {
        closePopup();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closePopup();
        closeSettings();
    }
});

// --- Unit labels on the forms ---
const weightFieldLabel = document.getElementById("weightFieldLabel");
const popupWeightFieldLabel = document.getElementById("popupWeightFieldLabel");

function updateUnitLabels() {
    const unit = getUnit();
    weightFieldLabel.textContent = `Weight (${unit}):`;
    popupWeightFieldLabel.textContent = `Weight (${unit}):`;
}

updateUnitLabels();
updateMonthLabel();
updateWeightPlaceholder();
drawGraph();

// --- Month navigation ---
prevMonthBtn.addEventListener("click", function() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateMonthLabel();
    drawGraph();
});

nextMonthBtn.addEventListener("click", function() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateMonthLabel();
    drawGraph();
});

// --- Form handling ---
const weightForm = document.getElementById("weightForm");
const dateInput = document.getElementById("dateInput");

weightForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const dateValue = dateInput.value;
    const weightValue = convertFromUnit(Number(weightInput.value));

    const existingEntry = entries.find(entry => entry.date === dateValue);

    if (existingEntry) {
        existingEntry.weight = weightValue;
    } else {
        entries.push({ date: dateValue, weight: weightValue });
    }

    saveEntries();

    const entryDate = new Date(dateValue);
    currentYear = entryDate.getFullYear();
    currentMonth = entryDate.getMonth();

    updateMonthLabel();
    updateWeightPlaceholder();
    drawGraph();

    weightForm.reset();
});

// --- Goal weight line ---
function getGoalWeight() {
    const storedGoal = localStorage.getItem("weightGoal");
    return storedGoal === null ? null : Number(storedGoal);
}

const goalButton = document.getElementById("goalButton");

goalButton.addEventListener("click", function() {
    const unit = getUnit();
    const currentGoalKg = getGoalWeight();
    const currentGoalDisplay = currentGoalKg === null ? "" : toDisplayWeight(currentGoalKg);
    const input = prompt(`Enter your goal weight in ${unit} (leave empty to remove it):`, currentGoalDisplay);

    if (input === null) {
        return;
    }

    if (input.trim() === "") {
        localStorage.removeItem("weightGoal");
        drawGraph();
        return;
    }

    const goalValueDisplay = Number(input);

    if (Number.isNaN(goalValueDisplay)) {
        alert("Please enter a valid number.");
        return;
    }

    localStorage.setItem("weightGoal", convertFromUnit(goalValueDisplay));
    drawGraph();
});

// --- Settings panel (unit, date format, moving average window, clear data) ---
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const unitSelect = document.getElementById("unitSelect");
const dateFormatSelect = document.getElementById("dateFormatSelect");
const movingAveragesWindowInput = document.getElementById("movingAveragesWindowInput");
const settingsClearButton = document.getElementById("settingsClearButton");
const settingsCloseButton = document.getElementById("settingsCloseButton");

function openSettings() {
    unitSelect.value = getUnit();
    dateFormatSelect.value = getDateFormat();
    movingAveragesWindowInput.value = getMovingAveragesWindow();
    settingsPanel.classList.remove("hidden");
}

function closeSettings() {
    settingsPanel.classList.add("hidden");
}

settingsButton.addEventListener("click", openSettings);
settingsCloseButton.addEventListener("click", closeSettings);

dateFormatSelect.addEventListener("change", function() {
    localStorage.setItem("weightDateFormat", dateFormatSelect.value);
    drawGraph();
});

unitSelect.addEventListener("change", function() {
    localStorage.setItem("weightUnit", unitSelect.value);
    updateUnitLabels();
    updateWeightPlaceholder();
    drawGraph();
});

movingAveragesWindowInput.addEventListener("change", function() {
    const value = Math.max(1, Math.round(Number(movingAveragesWindowInput.value)) || 5);
    movingAveragesWindowInput.value = value;
    localStorage.setItem("weightMovingAveragesWindow", value);
    drawGraph();
});

settingsClearButton.addEventListener("click", function() {
    if (!confirm("Are you sure you want to delete all weight entries? This cannot be undone.")) {
        return;
    }

    entries = [];
    localStorage.removeItem("weightEntries");
    closePopup();
    closeSettings();
    updateWeightPlaceholder();
    drawGraph();
});

document.addEventListener("click", function(event) {
    if (!settingsPanel.classList.contains("hidden") &&
        !settingsPanel.contains(event.target) &&
        event.target !== settingsButton) {
        closeSettings();
    }
});
