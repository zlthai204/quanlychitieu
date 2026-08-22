const AppState = {

    currentPage: "home",

    transactions: [],

    categories: [],

    dishes: [],

    codParts: [],

    editingTransactionId: null,

    transactionType: "thu",

    orderSource: "ShopeeFood",

    statisticsPeriod: "day",

    statisticsDate: new Date()

};


/* =========================
   INIT
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setToday();

        loadTheme();

        await loadInitialData();

        navigateTo("home");

    }
);


/* =========================
   INITIAL DATA
========================= */

async function loadInitialData() {

    try {

        AppState.categories =
            await dbGet("categories", {
                order: {
                    column: "created_at",
                    ascending: true
                }
            });

        AppState.dishes =
            await dbGet("dishes", {
                order: {
                    column: "created_at",
                    ascending: true
                }
            });

        AppState.transactions =
            await dbGet("transactions", {
                order: {
                    column: "date",
                    ascending: false
                }
            });

        renderAll();

    } catch (error) {

        console.error(error);

    }
}


/* =========================
   NAVIGATION
========================= */

function navigateTo(page) {

    AppState.currentPage = page;

    document
        .querySelectorAll(".page")
        .forEach(element => {

            element.classList.remove(
                "active-page"
            );

        });


    const pageElement =
        document.getElementById(
            `${page}Page`
        );

    if (pageElement) {

        pageElement.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove("active");

        });


    const navMap = {

        home: "navHome",

        statistics:
            "navStatistics",

        history:
            "navHistory",

        restaurant:
            "navRestaurant",

        cod:
            "navCOD"

    };


    const navButton =
        document.getElementById(
            navMap[page]
        );

    if (navButton) {

        navButton.classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (page === "home") {

        renderHome();

    }

    if (page === "statistics") {

        renderStatistics();

    }

    if (page === "history") {

        renderHistory();

    }

    if (page === "restaurant") {

        renderRestaurant();

    }

    if (page === "cod") {

        renderCOD();

    }

}


/* =========================
   RENDER ALL
========================= */

function renderAll() {

    renderHome();

    renderStatistics();

    renderHistory();

    renderRestaurant();

    renderCOD();

}


/* =========================
   TOAST
========================= */

let toastTimer;

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);
}


/* =========================
   THEME
========================= */

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark"
    );

    localStorage.setItem(
        "bep_nha_duyen_dark",
        document.body.classList.contains(
            "dark"
        )
    );

}


function loadTheme() {

    const dark =
        localStorage.getItem(
            "bep_nha_duyen_dark"
        );

    if (dark === "true") {

        document.body.classList.add(
            "dark"
        );

    }

}


/* =========================
   DATE
========================= */

function setToday() {

    const input =
        document.getElementById(
            "transactionDate"
        );

    if (!input) return;

    const now = new Date();

    // Dùng ngày LOCAL của thiết bị.
    // Không dùng toISOString() vì UTC có thể làm ngày bị lùi 1 ngày.
    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    input.value =
        `${year}-${month}-${day}`;


    const label =
        document.getElementById(
            "todayLabel"
        );

    if (label) {

        label.textContent =
            now.toLocaleDateString(
                "vi-VN"
            );

    }

}
