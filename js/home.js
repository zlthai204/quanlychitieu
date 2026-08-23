/* =========================================================
   HOME.JS
   BẾP NHÀ DUYÊN
========================================================= */


/* =========================================================
   RENDER HOME
========================================================= */

function renderHome() {

    renderTransactionCategories();

    renderTransactionDishes();

    renderHomeSummary();

}


/* =========================================================
   CATEGORY SELECT
========================================================= */

function renderTransactionCategories() {

    const select =
        document.getElementById(
            "transactionCategory"
        );


    if (!select) return;


    const oldValue =
        select.value;


    select.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>
    `;


    const categories =
        Array.isArray(
            AppState.categories
        )
            ? AppState.categories
            : [];


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category.id;


            option.textContent =
                category.name || "Không tên";


            select.appendChild(
                option
            );

        }
    );


    /*
     * Giữ lại danh mục đang chọn
     */

    if (
        categories.some(
            category =>
                String(category.id) ===
                String(oldValue)
        )
    ) {

        select.value =
            oldValue;

    }


    /*
     * Đổi danh mục -> đổi món
     */

    select.onchange =
        function () {

            renderTransactionDishes();

        };

}


/* =========================================================
   DISH SELECT
========================================================= */

function renderTransactionDishes() {

    const categorySelect =
        document.getElementById("transactionCategory");

    const dishSelect =
        document.getElementById("transactionDish");

    const picker =
        document.getElementById("transactionDishPicker");

    if (!categorySelect || !dishSelect) return;

    const categoryId = categorySelect.value;
    const oldDishValue = dishSelect.value;

    dishSelect.innerHTML = `
        <option value="">Chọn món</option>
    `;

    if (picker) {
        picker.innerHTML = "";
    }

    if (!categoryId) {
        if (picker) {
            picker.innerHTML = `
                <div class="dish-picker-empty">
                    <span class="dish-picker-empty-icon">🍽️</span>
                    <div>
                        <strong>Chọn danh mục trước</strong>
                        <small>Danh sách món sẽ hiện tại đây.</small>
                    </div>
                </div>
            `;
        }
        return;
    }

    const dishes =
        Array.isArray(AppState.dishes)
            ? AppState.dishes
            : [];

    const categoryDishes =
        dishes.filter(
            dish =>
                String(dish.category_id) ===
                String(categoryId)
        );

    categoryDishes.forEach(dish => {

        const option =
            document.createElement("option");

        option.value = dish.id;
        option.textContent =
            dish.name || "Không tên";

        dishSelect.appendChild(option);
    });

    if (
        categoryDishes.some(
            dish =>
                String(dish.id) ===
                String(oldDishValue)
        )
    ) {
        dishSelect.value = oldDishValue;
    }

    if (!picker) return;

    if (!categoryDishes.length) {
        picker.innerHTML = `
            <div class="dish-picker-empty">
                <span class="dish-picker-empty-icon">📭</span>
                <div>
                    <strong>Danh mục chưa có món</strong>
                    <small>Hãy thêm món vào danh mục này trong phần quản lý món.</small>
                </div>
            </div>
        `;
        return;
    }

    categoryDishes.forEach((dish, index) => {

        const card = document.createElement("button");
        card.type = "button";
        card.className = "dish-picker-card";
        card.dataset.dishId = String(dish.id);

        const isSelected =
            String(dish.id) ===
            String(dishSelect.value);

        if (isSelected) {
            card.classList.add("selected");
        }

        let cost = 0;

        try {
            if (typeof getDishCODCost === "function") {
                cost = Number(getDishCODCost(dish.id)) || 0;
            } else if (typeof getTransactionDishCost === "function") {
                cost = Number(
                    getTransactionDishCost({
                        dish_id: dish.id,
                        dishId: dish.id
                    })
                ) || 0;
            }
        } catch (error) {
            cost = 0;
        }

        card.innerHTML = `
            <span class="dish-picker-index">${index + 1}</span>
            <span class="dish-picker-main">
                <strong>${escapeHomeDishText(dish.name || "Không tên")}</strong>
                <small>${cost > 0 ? `Giá vốn • ${formatMoney(cost)}` : "Món bán • Chọn để thêm"}</small>
            </span>
            <span class="dish-picker-check">✓</span>
        `;

        card.addEventListener("click", () => {

            dishSelect.value = String(dish.id);

            picker
                .querySelectorAll(".dish-picker-card")
                .forEach(item => {
                    item.classList.toggle(
                        "selected",
                        item === card
                    );
                });

            dishSelect.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        });

        picker.appendChild(card);
    });
}


function escapeHomeDishText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   HOME SUMMARY
========================================================= */

function renderHomeSummary() {

    const transactions =
        Array.isArray(
            AppState.transactions
        )
            ? AppState.transactions
            : [];


    /*
     * =========================
     * TỔNG DOANH THU
     * =========================
     */

    const totalIncome =
        transactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "thu"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionAmount(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * TỔNG CHI PHÍ
     * =========================
     */

    const totalExpense =
        transactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "chi"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionAmount(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * TỔNG PHÍ APP
     * =========================
     */

    const totalAppFee =
        transactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "thu"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionFee(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * TỔNG GIÁ VỐN
     * =========================
     */

    const totalCost =
        calculateHomeCODCost(
            transactions
        );


    /*
     * =========================
     * LỢI NHUẬN
     * =========================
     */

    const totalProfit =
        totalIncome -
        totalExpense -
        totalAppFee -
        totalCost;


    /*
     * =========================
     * HIỂN THỊ TỔNG
     * =========================
     */

    setText(
        "homeRevenue",
        formatMoney(
            totalIncome
        )
    );


    setText(
        "homeExpense",
        formatMoney(
            totalExpense
        )
    );


    setText(
        "homeOrders",
        transactions.filter(
            transaction =>
                normalizeTransactionType(
                    transaction.type
                ) === "thu"
        ).length
    );


    setText(
        "homeProfit",
        formatMoney(
            totalProfit
        )
    );


    /*
     * =========================
     * HÔM NAY
     * =========================
     */

    renderTodaySummary(
        transactions
    );

}


/* =========================================================
   TODAY SUMMARY
========================================================= */

function renderTodaySummary(
    transactions
) {

    /*
     * Ngày local của thiết bị.
     *
     * Không dùng:
     * new Date().toISOString()
     *
     * vì có thể lệch ngày Việt Nam.
     */

    const today =
        getLocalDateString();


    /*
     * Lọc giao dịch hôm nay.
     *
     * Supabase date thường là:
     *
     * 2026-08-21
     *
     * Nhưng nếu dữ liệu có dạng:
     *
     * 2026-08-21T00:00:00...
     *
     * thì lấy 10 ký tự đầu.
     */

    const todayTransactions =
        transactions.filter(
            transaction => {

                if (
                    !transaction ||
                    !transaction.date
                ) {

                    return false;

                }


                const transactionDate =
                    String(
                        transaction.date
                    )
                    .substring(
                        0,
                        10
                    );


                return (
                    transactionDate ===
                    today
                );

            }
        );


    /*
     * =========================
     * DOANH THU HÔM NAY
     * =========================
     */

    const todayIncome =
        todayTransactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "thu"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionAmount(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * CHI PHÍ HÔM NAY
     * =========================
     */

    const todayExpense =
        todayTransactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "chi"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionAmount(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * PHÍ APP HÔM NAY
     * =========================
     */

    const todayAppFee =
        todayTransactions
            .filter(
                transaction =>
                    normalizeTransactionType(
                        transaction.type
                    ) === "thu"
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    getTransactionFee(
                        transaction
                    ),
                0
            );


    /*
     * =========================
     * GIÁ VỐN HÔM NAY
     * =========================
     */

    const todayCost =
        calculateHomeCODCost(
            todayTransactions
        );


    /*
     * =========================
     * HIỂN THỊ
     * =========================
     */

    setText(
        "todayRevenue",
        formatMoney(
            todayIncome
        )
    );


    setText(
        "todayExpense",
        formatMoney(
            todayExpense
        )
    );


    setText(
        "todayAppFee",
        formatMoney(
            todayAppFee
        )
    );


    setText(
        "todayCost",
        formatMoney(
            todayCost
        )
    );


    /*
     * =========================
     * NGÀY HIỂN THỊ
     * =========================
     */

    const todayLabel =
        document.getElementById(
            "todayLabel"
        );


    if (todayLabel) {

        todayLabel.textContent =
            formatVietnameseDate(
                today
            );

    }

}


/* =========================================================
   CALCULATE COD COST
========================================================= */

function calculateHomeCODCost(transactions) {
    if (!Array.isArray(transactions)) return 0;

    return transactions.reduce((total, transaction) => {
        if (normalizeTransactionType(transaction?.type) !== "thu") {
            return total;
        }

        return total + getTransactionDishCost(transaction);
    }, 0);
}


/* =========================================================
   TRANSACTION TYPE
========================================================= */

function normalizeTransactionType(
    type
) {

    return String(
        type || ""
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   TRANSACTION AMOUNT
========================================================= */

function getTransactionAmount(transaction) {
    if (!transaction) return 0;

    return parseMoneyValue(
        transaction.amount ??
        transaction.money ??
        transaction.total ??
        0
    );
}


/* =========================================================
   TRANSACTION FEE
========================================================= */

function getTransactionFee(transaction) {
    if (!transaction) return 0;

    const source = String(transaction.source || "").trim().toLowerCase();
    const isPlatformOrder = source === "shopeefood" || source === "grabfood";
    if (!isPlatformOrder) return 0;

    return parseMoneyValue(
        transaction.app_fee ??
        transaction.appFee ??
        0
    );
}


/* =========================================================
   LOCAL DATE
========================================================= */

function getLocalDateString() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   TRANSACTION TYPE BUTTON
========================================================= */

function setTransactionType(
    type
) {

    AppState.transactionType =
        type;


    const incomeButton =
        document.getElementById(
            "incomeTypeButton"
        );


    const expenseButton =
        document.getElementById(
            "expenseTypeButton"
        );


    if (incomeButton) {

        incomeButton.classList.toggle(
            "active",
            type === "thu"
        );

    }


    if (expenseButton) {

        expenseButton.classList.toggle(
            "active",
            type === "chi"
        );

    }


    const sourceBox =
        document.getElementById(
            "orderSourceBox"
        );


    const feeBox =
        document.getElementById(
            "appFeeBox"
        );


    const isIncome =
        type === "thu";


    if (sourceBox) {

        sourceBox.style.display =
            isIncome
                ? "block"
                : "none";

    }


    if (feeBox) {

        feeBox.style.display =
            isIncome
                ? "block"
                : "none";

    }

}


/* =========================================================
   ORDER SOURCE
========================================================= */

function setOrderSource(
    source
) {

    AppState.orderSource =
        source;


    document
        .querySelectorAll(
            ".source-button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );

            }
        );


    const sourceMap = {

        ShopeeFood:
            "sourceShopee",

        GrabFood:
            "sourceGrab",

        "Ngoài sàn":
            "sourceOutside"

    };


    const button =
        document.getElementById(
            sourceMap[source]
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }

}


/* =========================================================
   SAVE TRANSACTION
========================================================= */

async function saveTransaction() {

    const categoryId =
        document.getElementById(
            "transactionCategory"
        )?.value || "";


    const dishId =
        document.getElementById(
            "transactionDish"
        )?.value || "";


    const customName =
        document.getElementById(
            "transactionName"
        )?.value
        ?.trim() || "";


    const amount =
        Number(
            document.getElementById(
                "transactionAmount"
            )?.value
        ) || 0;


    const appFee =
        Number(
            document.getElementById(
                "appFee"
            )?.value
        ) || 0;


    const date =
        document.getElementById(
            "transactionDate"
        )?.value ||
        getLocalDateString();


    const note =
        document.getElementById(
            "transactionNote"
        )?.value
        ?.trim() || "";


    /*
     * Kiểm tra số tiền
     */

    if (
        amount <= 0
    ) {

        showToast(
            "Vui lòng nhập số tiền"
        );

        return;

    }


    /*
     * Tìm món
     */

    const dish =
        AppState.dishes.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    dishId
                )
        );


    /*
     * Tìm danh mục
     */

    const category =
        AppState.categories.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    categoryId
                )
        );


    /*
     * Tạo dữ liệu gửi database
     */

    const payload = {

        type:
            AppState.transactionType,

        category_id:
            categoryId
                ? categoryId
                : null,

        dish_id:
            dishId
                ? dishId
                : null,

        category_name:
            category?.name ||
            "",

        dish_name:
            dish?.name ||
            customName ||
            "Giao dịch",

        source:
            AppState.transactionType ===
            "thu"
                ? AppState.orderSource
                : null,

        amount:
            amount,

        app_fee:
            AppState.transactionType ===
            "thu"
                ? appFee
                : 0,

        date:
            date,

        note:
            note

    };


    try {

        /*
         * =========================
         * EDIT
         * =========================
         */

        if (
            AppState.editingTransactionId
        ) {

            await dbUpdate(
                "transactions",
                AppState.editingTransactionId,
                payload
            );


            showToast(
                "Đã cập nhật giao dịch"
            );

        }


        /*
         * =========================
         * INSERT
         * =========================
         */

        else {

            await dbInsert(
                "transactions",
                payload
            );


            showToast(
                "Đã lưu giao dịch"
            );

        }


        /*
         * =========================
         * LOAD LẠI TRANSACTIONS
         * =========================
         */

        AppState.transactions =
            await dbGet(
                "transactions",
                {
                    order: {
                        column:
                            "date",

                        ascending:
                            false
                    }
                }
            );


        /*
         * Clear form
         */

        clearTransactionForm();


        /*
         * Render toàn app
         */

        renderAll();


    }
    catch (error) {

        console.error(
            "Lỗi saveTransaction:",
            error
        );

    }

}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearTransactionForm() {

    const category =
        document.getElementById(
            "transactionCategory"
        );


    const dish =
        document.getElementById(
            "transactionDish"
        );


    const name =
        document.getElementById(
            "transactionName"
        );


    const fee =
        document.getElementById(
            "appFee"
        );


    const amount =
        document.getElementById(
            "transactionAmount"
        );


    const note =
        document.getElementById(
            "transactionNote"
        );


    if (category) {

        category.value =
            "";

    }


    if (dish) {

        dish.innerHTML = `
            <option value="">
                Chọn món
            </option>
        `;

    }


    if (name) {

        name.value =
            "";

    }


    if (fee) {

        fee.value =
            "";

    }


    if (amount) {

        amount.value =
            "";

    }


    if (note) {

        note.value =
            "";

    }


    AppState.editingTransactionId =
        null;


    const cancelButton =
        document.getElementById(
            "cancelEditButton"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    setToday();

    setTransactionType(
        "thu"
    );

    setOrderSource(
        "ShopeeFood"
    );

}


/* =========================================================
   CANCEL EDIT
========================================================= */

function cancelEdit() {

    clearTransactionForm();

    showToast(
        "Đã hủy sửa"
    );

}


/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(
    value
) {

    return (
        Number(
            value || 0
        )
        .toLocaleString(
            "vi-VN"
        ) +
        " ₫"
    );

}


/* =========================================================
   FORMAT VIETNAMESE DATE
========================================================= */

function formatVietnameseDate(
    dateString
) {

    if (!dateString) {

        return "";

    }


    const value =
        String(
            dateString
        )
        .substring(
            0,
            10
        );


    const parts =
        value.split("-");


    if (
        parts.length !== 3
    ) {

        return value;

    }


    return (
        `${parts[2]}/${parts[1]}/${parts[0]}`
    );

}
