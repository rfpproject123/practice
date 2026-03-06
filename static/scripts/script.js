// Holds the user-selected local file handle for live CSV updates
let csvFileHandle = null;

document.addEventListener("DOMContentLoaded", () => {

    const content = document.getElementById("content");
    const navItems = document.querySelectorAll(".nav-item");

    function loadPage(page) {
        fetch(`/static/pages/${page}.html`)
            .then(res => res.text())
            .then(html => {
                content.innerHTML = html;

                if (page === "table") handleTablePageLoad();
                if (page === "order") renderOrderPage();
                if (page === "ready") renderReadyPage();
                if (page === "cleaning") renderCleaningPage();
                if (page === "payment") renderPaymentPage();
            });
    }

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            if (!target) return;

            navItems.forEach(link => link.classList.remove("active"));
            item.classList.add("active");

            loadPage(target);
        });
    });

    loadPage("home");
});


function handleTablePageLoad() {

    const savedData = localStorage.getItem("restaurantData");

    if (savedData) {
        showOverview();
        loadOverview();
    } else {
        showConfig();
    }
}


function showConfig() {
    const config = document.getElementById("tableConfigSection");
    const overview = document.getElementById("tableOverviewSection");

    if (config && overview) {
        config.classList.remove("hidden");
        overview.classList.add("hidden");
    }
}


function showOverview() {
    const config = document.getElementById("tableConfigSection");
    const overview = document.getElementById("tableOverviewSection");

    if (config && overview) {
        config.classList.add("hidden");
        overview.classList.remove("hidden");
    }
}


document.addEventListener("change", function (e) {

    if (e.target.id === "noOfTables") {

        const container = document.getElementById("tablesContainer");
        container.innerHTML = "";

        const count = e.target.value;
        if (!count) return;

        for (let i = 1; i <= count; i++) {
            container.innerHTML += `
                <div class="form-group">
                    <label>Seats in Table ${i}</label>
                    <select class="input large-input seatSelect" data-table="${i}">
                        <option value="">Select</option>
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                    </select>
                </div>
            `;
        }

        showConfig();
    }
});


document.addEventListener("click", function (e) {

    if (e.target.id === "confirmTablesBtn") {

        const totalTables = document.getElementById("noOfTables").value;
        const seatSelections = document.querySelectorAll(".seatSelect");

        if (!totalTables) return;

        let totalSeats = 0;
        let tableData = [];

        seatSelections.forEach(select => {
            const seats = parseInt(select.value) || 0;
            totalSeats += seats;
            tableData.push({
                table: select.dataset.table,
                seats: seats
            });
        });

        const restaurantData = { totalTables, totalSeats, tableData };
        localStorage.setItem("restaurantData", JSON.stringify(restaurantData));

        showOverview();
        loadOverview();
        initQueues();                          // populate ready queues from table config
        saveTableCSVLocally(restaurantData);   // update local table.csv live
        saveTableCSVToGitHub(restaurantData);  // also commit to GitHub
    }

    if (e.target.id === "editTablesBtn") {

        const confirmEdit = confirm("Are you sure you want to edit the table configuration?");

        if (confirmEdit) {
            localStorage.removeItem("restaurantData");
            showConfig();
        }
    }
});


function loadOverview() {

    const data = JSON.parse(localStorage.getItem("restaurantData"));
    if (!data) return;

    document.getElementById("totalTablesDisplay").innerText = data.totalTables;
    document.getElementById("totalSeatsDisplay").innerText = data.totalSeats;

    const container = document.getElementById("summaryContent");
    container.innerHTML = "";

    data.tableData.forEach(table => {
        container.innerHTML += `
            <div class="row">
                Table ${table.table}
                <span>${table.seats} seats</span>
            </div>
        `;
    });
}


async function saveTableCSVLocally(data) {

    // Build CSV text
    const rows = [
        ["Table Number", "Seats"],
        ...data.tableData.map(t => [`Table ${t.table}`, t.seats]),
        [],
        ["Total Tables", data.totalTables],
        ["Total Seats", data.totalSeats]
    ];
    const csvContent = rows.map(row => row.join(",")).join("\n");

    try {
        // Ask the user to pick / confirm the file only on the very first save
        if (!csvFileHandle) {
            csvFileHandle = await window.showSaveFilePicker({
                suggestedName: "table.csv",
                types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }]
            });
        }

        // Write the updated content to the local file
        const writable = await csvFileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();

        console.log("table.csv updated locally.");

    } catch (err) {
        if (err.name !== "AbortError") {
            console.error("Local file save error:", err);
        }
    }
}


async function saveTableCSVToGitHub(data) {

    // ── CONFIG ────────────────────────────────────────────────
    const GITHUB_TOKEN = "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";
    const OWNER = "rfpproject123";
    const REPO = "practice";
    const FILE_PATH = "table.csv";
    // ─────────────────────────────────────────────────────────

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const headers = {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json"
    };

    // Build CSV content
    const rows = [
        ["Table Number", "Seats"],
        ...data.tableData.map(t => [`Table ${t.table}`, t.seats]),
        [],
        ["Total Tables", data.totalTables],
        ["Total Seats", data.totalSeats]
    ];
    const csvContent = rows.map(row => row.join(",")).join("\n");
    const encodedContent = btoa(unescape(encodeURIComponent(csvContent)));

    try {
        // Get current file SHA (required for updates)
        const getRes = await fetch(apiUrl, { headers });
        const getJson = await getRes.json();
        const sha = getJson.sha;

        // Commit the updated file
        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Update table.csv with latest configuration",
                content: encodedContent,
                sha: sha
            })
        });

        if (putRes.ok) {
            console.log("table.csv updated in GitHub successfully.");
        } else {
            const err = await putRes.json();
            console.error("GitHub API error:", err.message);
            alert("Failed to save to GitHub: " + err.message);
        }
    } catch (err) {
        console.error("Network error:", err);
        alert("Network error while saving to GitHub.");
    }
}


// ══════════════════════════════════════════════════════════════════
//  QUEUE ENGINE
// ══════════════════════════════════════════════════════════════════

function getQueues() {
    return {
        ready: JSON.parse(localStorage.getItem("readyQueues") || "{}"),
        cleaning: JSON.parse(localStorage.getItem("cleaningQueues") || "{}"),
        allocated: JSON.parse(localStorage.getItem("allocatedTables") || "{}"),
        priority: JSON.parse(localStorage.getItem("priorityQueue") || "[]")
    };
}

function saveQueues({ ready, cleaning, allocated, priority }) {
    localStorage.setItem("readyQueues", JSON.stringify(ready));
    localStorage.setItem("cleaningQueues", JSON.stringify(cleaning));
    localStorage.setItem("allocatedTables", JSON.stringify(allocated));
    localStorage.setItem("priorityQueue", JSON.stringify(priority));
}

// Called once when table config is confirmed — seeds all ready queues
function initQueues() {
    const data = JSON.parse(localStorage.getItem("restaurantData"));
    if (!data) return;
    const ready = {};
    data.tableData.forEach(t => {
        const key = String(t.seats);
        if (!ready[key]) ready[key] = [];
        ready[key].push(Number(t.table));
    });
    saveQueues({ ready, cleaning: {}, allocated: {}, priority: [] });
}

// Priority: VIP=0, then descending party size
function getPriority(c) {
    if (c.isVIP) return 0;
    return { 10: 1, 8: 2, 6: 3, 4: 4, 2: 5 }[c.partySize] || 6;
}

function addToPriorityQueue(customer) {
    const q = getQueues();
    customer.arrivedAt = new Date().toLocaleTimeString();
    q.priority.push(customer);
    q.priority.sort((a, b) => getPriority(a) - getPriority(b));
    saveQueues(q);
}

// Finds smallest sufficient table: exact match first, then next larger size
function findReadyTable(ready, partySize) {
    const sizes = [2, 4, 6, 8, 10].filter(s => s >= partySize);
    for (const size of sizes) {
        const key = String(size);
        if (ready[key] && ready[key].length > 0) return key;
    }
    return null;
}

// Dequeues top-priority customer and assigns best matching table
function allocateNextCustomer() {
    const q = getQueues();
    if (q.priority.length === 0) return null;

    const customer = q.priority[0];
    const matchedSize = findReadyTable(q.ready, customer.partySize);
    if (!matchedSize) return { customer, allocated: false };

    const tableNum = q.ready[matchedSize].shift();
    if (q.ready[matchedSize].length === 0) delete q.ready[matchedSize];
    q.priority.shift();

    q.allocated[String(tableNum)] = {
        tableNum,
        seats: Number(matchedSize),
        customer,
        allocatedAt: new Date().toLocaleTimeString()
    };
    saveQueues(q);
    return { customer, tableNum, seats: matchedSize, allocated: true };
}

// Moves table from allocated → cleaning queue
function processPayment(tableNum) {
    const q = getQueues();
    const entry = q.allocated[String(tableNum)];
    if (!entry) return;
    const key = String(entry.seats);
    if (!q.cleaning[key]) q.cleaning[key] = [];
    q.cleaning[key].push(tableNum);
    delete q.allocated[String(tableNum)];
    saveQueues(q);
}

// Moves table from cleaning → ready, then tries to allocate next customer
function markCleaned(tableNum) {
    const q = getQueues();
    let seats = null;
    for (const s of Object.keys(q.cleaning)) {
        const idx = q.cleaning[s].indexOf(Number(tableNum));
        if (idx !== -1) {
            seats = s;
            q.cleaning[s].splice(idx, 1);
            if (q.cleaning[s].length === 0) delete q.cleaning[s];
            break;
        }
    }
    if (seats) {
        if (!q.ready[seats]) q.ready[seats] = [];
        q.ready[seats].push(Number(tableNum));
        saveQueues(q);
        allocateNextCustomer(); // auto-allocate if someone is waiting
    }
}


// ══════════════════════════════════════════════════════════════════
//  PAGE RENDERERS
// ══════════════════════════════════════════════════════════════════

// ── ORDER PAGE ────────────────────────────────────────────────────
function renderOrderPage() {
    refreshOrderQueue();
}

function submitOrder() {
    const name = document.getElementById("customerName").value.trim();
    const partySize = parseInt(document.getElementById("partySize").value);
    const isVIP = document.getElementById("isVIP").checked;

    if (!name || !partySize) {
        alert("Please enter customer name and party size.");
        return;
    }

    addToPriorityQueue({ name, partySize, isVIP });
    const result = allocateNextCustomer();

    document.getElementById("customerName").value = "";
    document.getElementById("partySize").value = "";
    document.getElementById("isVIP").checked = false;

    const banner = document.getElementById("allocationBanner");
    if (result && result.allocated) {
        banner.style.display = "block";
        banner.style.background = "#22c55e22";
        banner.style.border = "1px solid #22c55e";
        banner.innerHTML = `✅ <strong>${result.customer.name}</strong> allocated to <strong>Table ${result.tableNum}</strong> (${result.seats} seats)`;
    } else {
        banner.style.display = "block";
        banner.style.background = "#f97316aa";
        banner.style.border = "1px solid #f97316";
        banner.innerHTML = `⏳ <strong>${name}</strong> added to queue — no matching table available right now.`;
    }
    refreshOrderQueue();
}

function refreshOrderQueue() {
    const q = getQueues();
    const list = document.getElementById("priorityQueueList");
    if (!list) return;
    if (q.priority.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8;">No customers waiting.</p>`;
        return;
    }
    list.innerHTML = q.priority.map((c, i) => `
        <div class="row" style="align-items:center;">
            <span>${i + 1}.
                ${c.isVIP ? "<span style='color:#f59e0b;font-weight:700;'>⭐ VIP</span> " : ""}
                <strong>${c.name}</strong> — party of ${c.partySize}
            </span>
            <span style="color:#94a3b8;font-size:14px;">${c.arrivedAt}</span>
        </div>`).join("");
}

// ── READY PAGE ────────────────────────────────────────────────────
function renderReadyPage() {
    const q = getQueues();

    // Ready Queues
    const rEl = document.getElementById("readyQueuesContainer");
    const sizes = Object.keys(q.ready).sort((a, b) => a - b);
    if (sizes.length === 0) {
        rEl.innerHTML = `<p style="color:#94a3b8;">All tables are currently occupied or being cleaned.</p>`;
    } else {
        rEl.innerHTML = sizes.map(s => `
            <div class="stat-box" style="margin-bottom:16px;">
                <span>${s}-Seat Tables Queue</span>
                <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;">
                    ${q.ready[s].map(t => `<span class="queue-chip green">Table ${t}</span>`).join("")}
                </div>
            </div>`).join("");
    }

    // Allocated Tables
    const aEl = document.getElementById("allocatedContainer");
    const entries = Object.values(q.allocated);
    if (entries.length === 0) {
        aEl.innerHTML = `<p style="color:#94a3b8;">No tables currently occupied.</p>`;
    } else {
        aEl.innerHTML = entries.map(e => `
            <div class="row">
                <span><strong>Table ${e.tableNum}</strong> (${e.seats} seats)</span>
                <span>${e.customer.isVIP ? "⭐ VIP — " : ""}${e.customer.name} &nbsp;|&nbsp; since ${e.allocatedAt}</span>
            </div>`).join("");
    }
}

// ── CLEANING PAGE ─────────────────────────────────────────────────
function renderCleaningPage() {
    const q = getQueues();

    const cEl = document.getElementById("cleaningQueuesContainer");
    const sizes = Object.keys(q.cleaning).sort((a, b) => a - b);
    if (sizes.length === 0) {
        cEl.innerHTML = `<p style="color:#94a3b8;">No tables in cleaning queue.</p>`;
    } else {
        cEl.innerHTML = sizes.map(s => `
            <div class="stat-box" style="margin-bottom:16px;">
                <span>${s}-Seat Tables — Cleaning Queue</span>
                <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;">
                    ${q.cleaning[s].map(t =>
            `<button class="queue-chip orange" onclick="cleanedAndRefresh(${t})">Table ${t} ✓ Cleaned</button>`
        ).join("")}
                </div>
            </div>`).join("");
    }
}

function cleanedAndRefresh(tableNum) {
    markCleaned(tableNum);
    renderCleaningPage();
}

// ── PAYMENT PAGE ──────────────────────────────────────────────────
function renderPaymentPage() {
    const q = getQueues();
    const pEl = document.getElementById("paymentContainer");
    const entries = Object.values(q.allocated);
    if (entries.length === 0) {
        pEl.innerHTML = `<p style="color:#94a3b8;">No occupied tables.</p>`;
        return;
    }
    pEl.innerHTML = entries.map(e => `
        <div class="row" style="align-items:center;">
            <div>
                <strong>Table ${e.tableNum}</strong> (${e.seats} seats)<br>
                <span style="color:#94a3b8;">${e.customer.isVIP ? "⭐ VIP — " : ""}${e.customer.name} &nbsp;·&nbsp; Party of ${e.customer.partySize} &nbsp;·&nbsp; Since ${e.allocatedAt}</span>
            </div>
            <button class="btn-primary" onclick="paymentAndRefresh(${e.tableNum})">💳 Payment Done</button>
        </div>`).join("");
}

function paymentAndRefresh(tableNum) {
    processPayment(tableNum);
    renderPaymentPage();
}