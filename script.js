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

    // Load Home by default
    loadPage("home");
});
