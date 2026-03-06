document.addEventListener("DOMContentLoaded", () => {

    const content = document.getElementById("content");
    const navItems = document.querySelectorAll(".nav-item");

    function loadPage(page) {
        fetch(`/static/pages/${page}.html`)
            .then(res => res.text())
            .then(html => {
                content.innerHTML = html;

                if (page === "table") {
                    handleTablePageLoad();
                }
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

        localStorage.setItem("restaurantData", JSON.stringify({
            totalTables,
            totalSeats,
            tableData
        }));

        showOverview();
        loadOverview();
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
