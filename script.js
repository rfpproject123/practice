document.addEventListener("DOMContentLoaded", () => {

    const content = document.getElementById("content");
    const navItems = document.querySelectorAll(".nav-item");

    function loadPage(page) {
        fetch(`/static/pages/${page}.html`)
            .then(res => res.text())
            .then(html => {
                content.innerHTML = html;
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

        document.getElementById("totalTablesDisplay").innerText = totalTables;
        document.getElementById("totalSeatsDisplay").innerText = totalSeats;

        const container = document.getElementById("summaryContent");
        container.innerHTML = "";

        tableData.forEach(table => {
            container.innerHTML += `
                <div class="row">
                    Table ${table.table}
                    <span>${table.seats} seats</span>
                </div>
            `;
        });

        document.getElementById("tableConfigSection").classList.add("hidden");
        document.getElementById("tableOverviewSection").classList.remove("hidden");
    }

    if (e.target.id === "editTablesBtn") {

        const confirmEdit = confirm("Are you sure you want to edit the table configuration?");

        if (confirmEdit) {
            document.getElementById("tableOverviewSection").classList.add("hidden");
            document.getElementById("tableConfigSection").classList.remove("hidden");
        }
    }
});
