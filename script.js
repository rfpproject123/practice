document.addEventListener("DOMContentLoaded", () => {
    console.log("script.js loaded");

    const content = document.getElementById("content");
    const navItems = document.querySelectorAll(".nav-item");

    function loadPage(page) {
        fetch(`/static/pages/${page}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Page not found");
                }
                return response.text();
            })
            .then(html => {
                content.innerHTML = html;
            })
            .catch(error => {
                content.innerHTML = "<h2 style='color:white'>Page not found</h2>";
                console.error(error);
            });
    }

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            if (target) {
                loadPage(target);
            }
        });
    });

    loadPage("home");
});

// ----------- Dynamic Tables Functionality -----------

document.addEventListener("change", function (e) {

    if (e.target && e.target.id === "noOfTables") {

        const numberOfTables = e.target.value;
        const container = document.getElementById("tablesContainer");

        if (!container) return;

        container.innerHTML = "";

        if (!numberOfTables) return;

        for (let i = 1; i <= numberOfTables; i++) {

            const div = document.createElement("div");
            div.style.marginBottom = "20px";

            div.innerHTML = `
                <div >
                    <label style="font-size: 25px; color: white;">
                        Number of Seats in Table ${i} :
                    </label>
                    <select class="seatSelect glass-select" data-table="${i}">
                        <option value="">-- Select --</option>
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                    </select>
                </div>
            `;

            container.appendChild(div);
        }
    }
});

// -------- Display Summary Instead of Alert --------

document.addEventListener("click", function (e) {

    if (e.target && e.target.id === "generateBtn") {

        const totalTables = document.getElementById("noOfTables").value;
        const seatSelections = document.querySelectorAll(".seatSelect");
        const resultContainer = document.getElementById("resultContainer");

        if (!resultContainer) return;

        let totalSeats = 0;
        let output = `
            <div style="
                background: rgba(60, 30, 10, 0.75);
                backdrop-filter: blur(8px);
                padding: 25px;
                border-radius: 18px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                text-align: center;
            ">
                <h3 style="margin-bottom:15px;">Summary</h3>
                <p><strong>Total Tables:</strong> ${totalTables}</p>
                <br>
        `;

        seatSelections.forEach(select => {

            const seats = parseInt(select.value);

            if (!isNaN(seats)) {
                totalSeats += seats;
            }

            output += `
                <p>Table ${select.dataset.table} → ${select.value || 0} seats</p>
            `;
        });

        output += `
                
                <p><strong>Total Seating Capacity:</strong> ${totalSeats}</p>
            </div>
        `;

        resultContainer.innerHTML = output;

        // Animate Summary Appearance
        resultContainer.style.opacity = "0";
        resultContainer.style.transform = "translateY(20px)";

        setTimeout(() => {
            resultContainer.style.opacity = "1";
            resultContainer.style.transform = "translateY(0)";
        }, 50);
    }
});
