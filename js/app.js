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



/* =========================================================
   MONEY / DISH COST HELPERS - DÙNG CHUNG
========================================================= */

function parseMoneyValue(value) {
    if (value === null || value === undefined || value === "") return 0;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
        let s = value.trim();
        if (!s) return 0;

        // Hỗ trợ "15.000", "15,000", "15.000 ₫", "15000"
        s = s.replace(/[₫đĐ\s]/g, "");

        if (s.includes(".") && s.includes(",")) {
            // 15.000,50 -> 15000.50
            s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
            const parts = s.split(",");
            if (parts.length === 2 && parts[1].length <= 2) {
                s = parts[0].replace(/\./g, "") + "." + parts[1];
            } else {
                s = s.replace(/,/g, "");
            }
        } else if (s.includes(".")) {
            const parts = s.split(".");
            // 15.000 được hiểu là 15000, không phải 15
            if (parts.length === 2 && parts[1].length === 3) {
                s = parts[0] + parts[1];
            }
        }

        const n = Number(s.replace(/[^0-9.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    }

    return 0;
}

function getDishCostFromDish(dish) {
    if (!dish) return 0;

    let parts = dish.cod_parts;

    // Một số dữ liệu có thể được lưu dưới dạng JSON string.
    if (typeof parts === "string") {
        try {
            parts = JSON.parse(parts);
        } catch (e) {
            parts = [];
        }
    }

    if (!Array.isArray(parts)) return 0;

    return parts.reduce((sum, part) => {
        if (!part) return sum;
        return sum + parseMoneyValue(
            part.amount ?? part.cost ?? part.price ?? 0
        );
    }, 0);
}

function getTransactionDishCost(transaction) {
    if (!transaction) return 0;

    const dishes = Array.isArray(AppState.dishes)
        ? AppState.dishes
        : [];

    let dish = null;

    if (transaction.dish_id !== null &&
        transaction.dish_id !== undefined &&
        transaction.dish_id !== "") {
        dish = dishes.find(d =>
            String(d.id) === String(transaction.dish_id)
        );
    }

    // Dữ liệu giao dịch cũ có thể không còn dish_id.
    if (!dish && transaction.dish_name) {
        const name = String(transaction.dish_name).trim().toLowerCase();
        dish = dishes.find(d =>
            String(d.name || "").trim().toLowerCase() === name
        );
    }

    return getDishCostFromDish(dish);
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
