/* =========================================================
   STATISTICS.JS
   BẾP NHÀ DUYÊN
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       FORMAT
    ===================================================== */

    function formatMoney(value) {

        const number = Number(value) || 0;

        return number.toLocaleString("vi-VN") + " ₫";

    }


    window.formatMoney = formatMoney;


    /* =====================================================
       STATE
    ===================================================== */

    function getState() {

        if (
            typeof window.AppState === "undefined"
        ) {
            return null;
        }

        return window.AppState;

    }


    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    function getTransactions() {

        const state = getState();

        if (!state) {
            return [];
        }

        return Array.isArray(
            state.transactions
        )
            ? state.transactions
            : [];

    }


    /* =====================================================
       DATE HELPERS
    ===================================================== */

    function parseDate(value) {

        if (!value) {
            return null;
        }

        const date =
            value instanceof Date
                ? new Date(value)
                : new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date;

    }


    function startOfDay(date) {

        const result =
            new Date(date);

        result.setHours(
            0,
            0,
            0,
            0
        );

        return result;

    }


    function endOfDay(date) {

        const result =
            new Date(date);

        result.setHours(
            23,
            59,
            59,
            999
        );

        return result;

    }


    function startOfWeek(date) {

        const result =
            startOfDay(date);

        const day =
            result.getDay();

        const diff =
            day === 0
                ? -6
                : 1 - day;

        result.setDate(
            result.getDate() + diff
        );

        return result;

    }


    function endOfWeek(date) {

        const result =
            startOfWeek(date);

        result.setDate(
            result.getDate() + 6
        );

        return endOfDay(result);

    }


    function startOfMonth(date) {

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
            0,
            0,
            0,
            0
        );

    }


    function endOfMonth(date) {

        return new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
        );

    }


    /* =====================================================
       STATISTICS RANGE
    ===================================================== */

    function getStatisticsRange() {

        const state =
            getState();

        const period =
            state?.statisticsPeriod ||
            "day";

        const selectedDate =
            parseDate(
                state?.statisticsDate
            ) || new Date();


        let start;

        let end;


        if (period === "week") {

            start =
                startOfWeek(
                    selectedDate
                );

            end =
                endOfWeek(
                    selectedDate
                );

        }

        else if (period === "month") {

            start =
                startOfMonth(
                    selectedDate
                );

            end =
                endOfMonth(
                    selectedDate
                );

        }

        else {

            start =
                startOfDay(
                    selectedDate
                );

            end =
                endOfDay(
                    selectedDate
                );

        }


        return {
            start,
            end
        };

    }


    window.getStatisticsTransactions =
        function () {

            const range =
                getStatisticsRange();

            return getTransactions()
                .filter(transaction => {

                    const date =
                        parseDate(
                            transaction.date
                        );

                    if (!date) {
                        return false;
                    }

                    return (
                        date >= range.start &&
                        date <= range.end
                    );

                });

        };


    /* =====================================================
       NORMALIZE TRANSACTION
    ===================================================== */

    function normalizeTransaction(
        transaction
    ) {

        const amount =
            Number(
                transaction.amount ??
                transaction.money ??
                transaction.value ??
                0
            ) || 0;


        const appFee =
            Number(
                transaction.app_fee ??
                transaction.appFee ??
                transaction.platform_fee ??
                transaction.fee ??
                0
            ) || 0;


        const cost =
            Number(
                transaction.cost ??
                transaction.cod_cost ??
                transaction.cost_price ??
                transaction.cogs ??
                0
            ) || 0;


        const type =
            String(
                transaction.type ??
                ""
            )
                .toLowerCase()
                .trim();


        const source =
            transaction.order_source ??
            transaction.orderSource ??
            transaction.source ??
            "Khác";


        return {

            ...transaction,

            amount,

            appFee,

            cost,

            type,

            source

        };

    }


    /* =====================================================
       CALCULATE
    ===================================================== */

    function calculateStatistics(
        transactions
    ) {

        let revenue = 0;

        let expense = 0;

        let appFee = 0;

        let cost = 0;

        let orders = 0;

        let expenseCount = 0;


        const dishes = {};

        const categories = {};

        const sources = {};


        transactions.forEach(
            rawTransaction => {

                const transaction =
                    normalizeTransaction(
                        rawTransaction
                    );


                if (
                    transaction.type ===
                    "thu"
                ) {

                    revenue +=
                        transaction.amount;

                    orders++;


                    appFee +=
                        transaction.appFee;

                    cost +=
                        transaction.cost;


                    const dish =
                        transaction.dish_name ??
                        transaction.dish ??
                        transaction.name ??
                        "Không rõ";


                    if (!dishes[dish]) {

                        dishes[dish] = {

                            name: dish,

                            amount: 0,

                            count: 0

                        };

                    }


                    dishes[dish].amount +=
                        transaction.amount;

                    dishes[dish].count++;


                    const source =
                        transaction.source;


                    if (!sources[source]) {

                        sources[source] = {

                            name: source,

                            revenue: 0,

                            fee: 0,

                            count: 0

                        };

                    }


                    sources[source].revenue +=
                        transaction.amount;

                    sources[source].fee +=
                        transaction.appFee;

                    sources[source].count++;

                }


                if (
                    transaction.type ===
                    "chi"
                ) {

                    expense +=
                        transaction.amount;

                    expenseCount++;


                    const category =
                        transaction.category_name ??
                        transaction.category ??
                        "Khác";


                    if (
                        !categories[category]
                    ) {

                        categories[category] = {

                            name: category,

                            amount: 0,

                            count: 0

                        };

                    }


                    categories[category].amount +=
                        transaction.amount;

                    categories[category].count++;

                }

            }
        );


        const profit =
            revenue -
            expense -
            appFee -
            cost;


        return {

            revenue,

            expense,

            appFee,

            cost,

            profit,

            orders,

            expenseCount,

            expenseAverage:
                expenseCount > 0
                    ? expense /
                    expenseCount
                    : 0,

            dishes:
                Object.values(
                    dishes
                ),

            categories:
                Object.values(
                    categories
                ),

            sources:
                Object.values(
                    sources
                )

        };

    }


    /* =====================================================
       PERIOD LABEL
    ===================================================== */

    function updatePeriodLabel() {

        const state =
            getState();

        if (!state) {
            return;
        }


        const period =
            state.statisticsPeriod ||
            "day";


        const date =
            parseDate(
                state.statisticsDate
            ) || new Date();


        const element =
            document.getElementById(
                "statisticsPeriodLabel"
            );


        if (!element) {
            return;
        }


        if (period === "month") {

            element.textContent =
                `Tháng ${date.getMonth() + 1
                }/${date.getFullYear()}`;

        }

        else if (period === "week") {

            const start =
                startOfWeek(date);

            const end =
                endOfWeek(date);


            element.textContent =
                `${start.toLocaleDateString(
                    "vi-VN"
                )} - ${end.toLocaleDateString(
                    "vi-VN"
                )}`;

        }

        else {

            element.textContent =
                date.toLocaleDateString(
                    "vi-VN",
                    {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                );

        }

    }


    /* =====================================================
       PERIOD BUTTON
    ===================================================== */

    function updatePeriodButtons() {

        const state =
            getState();

        const period =
            state?.statisticsPeriod ||
            "day";


        document
            .querySelectorAll(
                ".period-tab"
            )
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.period ===
                    period
                );

            });

    }


    /* =====================================================
       OVERVIEW
    ===================================================== */

    function renderOverview(
        stats
    ) {

        setText(
            "statisticsProfit",
            formatMoney(stats.profit)
        );


        setText(
            "statisticsRevenue",
            formatMoney(stats.revenue)
        );


        setText(
            "statisticsExpense",
            formatMoney(stats.expense)
        );


        setText(
            "statisticsCOD",
            formatMoney(stats.cost)
        );


        setText(
            "statisticsShopeeFee",
            formatMoney(stats.appFee)
        );


        setText(
            "statisticsTotalExpense",
            formatMoney(stats.expense)
        );


        setText(
            "statisticsExpenseCount",
            stats.expenseCount
        );


        setText(
            "statisticsExpenseAverage",
            formatMoney(
                stats.expenseAverage
            )
        );


        setText(
            "statisticsFinalProfit",
            formatMoney(stats.profit)
        );

    }


    /* =====================================================
       DISH LIST
    ===================================================== */

    function renderDishList(
        stats
    ) {

        const container =
            document.getElementById(
                "statisticsDishList"
            );


        if (!container) {
            return;
        }


        if (
            stats.dishes.length === 0
        ) {

            container.innerHTML = `
                <div class="statistics-empty">
                    Chưa có dữ liệu doanh thu
                    trong kỳ này.
                </div>
            `;

            return;

        }


        const sorted =
            [...stats.dishes]
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                );


        container.innerHTML =
            sorted.map(
                item => `

                    <div class="statistics-detail-row">

                        <div>
                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${item.count} đơn
                            </small>
                        </div>

                        <strong class="green-text">
                            ${formatMoney(item.amount)}
                        </strong>

                    </div>

                `
            ).join("");

    }


    /* =====================================================
       EXPENSE CATEGORY
    ===================================================== */

    function renderExpenseCategories(
        stats
    ) {

        const container =
            document.getElementById(
                "statisticsExpenseCategoryList"
            );


        if (!container) {
            return;
        }


        if (
            stats.categories.length === 0
        ) {

            container.innerHTML = `
                <div class="statistics-empty">
                    Chưa có khoản chi trong kỳ này.
                </div>
            `;

            return;

        }


        const sorted =
            [...stats.categories]
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                );


        container.innerHTML =
            sorted.map(
                item => `

                    <div class="statistics-category-row">

                        <div class="statistics-category-info">

                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${item.count} khoản
                            </small>

                        </div>

                        <strong class="red-text">
                            ${formatMoney(item.amount)}
                        </strong>

                    </div>

                `
            ).join("");

    }


    /* =====================================================
       EXPENSE DETAIL
    ===================================================== */

    function renderExpenseList(
        transactions
    ) {

        const container =
            document.getElementById(
                "statisticsExpenseList"
            );


        if (!container) {
            return;
        }


        const expenses =
            transactions.filter(
                transaction =>
                    String(
                        transaction.type
                    )
                        .toLowerCase()
                        .trim() === "chi"
            );


        if (
            expenses.length === 0
        ) {

            container.innerHTML = `
                <div class="statistics-empty">
                    Chưa có khoản chi trong kỳ này.
                </div>
            `;

            return;

        }


        container.innerHTML =
            expenses.map(
                raw => {

                    const item =
                        normalizeTransaction(
                            raw
                        );


                    const name =
                        item.name ??
                        item.category_name ??
                        item.category ??
                        "Khoản chi";


                    return `

                        <div class="statistics-detail-row">

                            <div>

                                <strong>
                                    ${escapeHTML(name)}
                                </strong>

                                <small>
                                    ${formatDate(item.date)}
                                </small>

                            </div>

                            <strong class="red-text">
                                ${formatMoney(item.amount)}
                            </strong>

                        </div>

                    `;

                }
            ).join("");

    }


    /* =====================================================
       SOURCE
    ===================================================== */

    function renderSources(
        stats
    ) {

        const container =
            document.getElementById(
                "statisticsSourceList"
            );


        if (!container) {
            return;
        }


        if (
            stats.sources.length === 0
        ) {

            container.innerHTML = `
                <div class="statistics-empty">
                    Chưa có đơn hàng trong kỳ này.
                </div>
            `;

            return;

        }


        container.innerHTML =
            stats.sources.map(
                source => `

                    <div class="statistics-source-row">

                        <div>

                            <strong>
                                ${escapeHTML(source.name)}
                            </strong>

                            <small>
                                ${source.count} đơn
                            </small>

                        </div>

                        <div class="statistics-source-values">

                            <strong>
                                ${formatMoney(
                    source.revenue
                )}
                            </strong>

                            <small>
                                Phí:
                                ${formatMoney(
                    source.fee
                )}
                            </small>

                        </div>

                    </div>

                `
            ).join("");

    }


    /* =====================================================
       BAR CHART
    ===================================================== */

    function renderChart(
        transactions
    ) {

        const container =
            document.getElementById(
                "statisticsChart"
            );


        if (!container) {
            return;
        }


        const daily = {};


        transactions.forEach(
            raw => {

                const item =
                    normalizeTransaction(
                        raw
                    );


                const date =
                    parseDate(
                        item.date
                    );


                if (!date) {
                    return;
                }


                const key =
                    date.toISOString()
                        .slice(
                            0,
                            10
                        );


                if (!daily[key]) {

                    daily[key] = {

                        income: 0,

                        expense: 0

                    };

                }


                if (
                    item.type === "thu"
                ) {

                    daily[key].income +=
                        item.amount;

                }


                if (
                    item.type === "chi"
                ) {

                    daily[key].expense +=
                        item.amount;

                }

            }
        );


        const days =
            Object.entries(
                daily
            )
                .sort(
                    ([a], [b]) =>
                        a.localeCompare(b)
                );


        if (days.length === 0) {

            container.innerHTML = `
                <div class="statistics-empty">
                    Chưa có dữ liệu biểu đồ.
                </div>
            `;

            return;

        }


        const max =
            Math.max(
                ...days.flatMap(
                    ([, item]) => [
                        item.income,
                        item.expense
                    ]
                ),
                1
            );


        container.innerHTML =
            days.map(
                ([date, item]) => {

                    const incomeHeight =
                        Math.max(
                            4,
                            item.income /
                            max *
                            100
                        );


                    const expenseHeight =
                        Math.max(
                            4,
                            item.expense /
                            max *
                            100
                        );


                    return `

                        <div class="statistics-chart-column">

                            <div class="statistics-chart-bars">

                                <div
                                    class="statistics-bar income"
                                    style="height:${incomeHeight}%"
                                    title="Thu: ${formatMoney(item.income)}">
                                </div>

                                <div
                                    class="statistics-bar expense"
                                    style="height:${expenseHeight}%"
                                    title="Chi: ${formatMoney(item.expense)}">
                                </div>

                            </div>

                            <small>
                                ${formatShortDate(date)}
                            </small>

                        </div>

                    `;

                }
            ).join("");

    }


    /* =====================================================
       PIE CHART
    ===================================================== */

    function renderPie(
        stats
    ) {

        const total =
            stats.revenue +
            stats.expense;


        const incomePercent =
            total > 0
                ? stats.revenue /
                total *
                100
                : 0;


        const expensePercent =
            total > 0
                ? stats.expense /
                total *
                100
                : 0;


        const pie =
            document.getElementById(
                "statisticsPieChart"
            );


        if (pie) {

            pie.style.background =
                total > 0
                    ? `conic-gradient(
                        #22c55e 0% ${incomePercent}%,
                        #ef4444 ${incomePercent}% 100%
                    )`
                    : `
                        conic-gradient(
                            #e5e7eb 0% 100%
                        )
                    `;

        }


        setText(
            "statisticsIncomePercent",
            incomePercent.toFixed(1) + "%"
        );


        setText(
            "statisticsExpensePercent",
            expensePercent.toFixed(1) + "%"
        );


        setText(
            "statisticsPieTotal",
            formatMoney(total)
        );

    }


    /* =====================================================
       MAIN RENDER
    ===================================================== */

    function renderStatistics() {

        const state =
            getState();


        if (!state) {
            return;
        }


        updatePeriodLabel();

        updatePeriodButtons();


        const transactions =
            window.getStatisticsTransactions
                ? window.getStatisticsTransactions()
                : getTransactions();


        const stats =
            calculateStatistics(
                transactions
            );


        renderOverview(
            stats
        );


        renderDishList(
            stats
        );


        renderExpenseCategories(
            stats
        );


        renderExpenseList(
            transactions
        );


        renderSources(
            stats
        );


        renderChart(
            transactions
        );


        renderPie(
            stats
        );

    }


    window.renderStatistics =
        renderStatistics;


    /* =====================================================
       PERIOD CONTROL
    ===================================================== */

    window.setStatisticsPeriod =
        function (period) {

            const state =
                getState();

            if (!state) {
                return;
            }


            state.statisticsPeriod =
                period;


            renderStatistics();

            if (
                typeof window.updateStatisticsPie ===
                "function"
            ) {

                window.updateStatisticsPie();

            }

        };


    window.statisticsPrevious =
        function () {

            const state =
                getState();

            if (!state) {
                return;
            }


            const date =
                parseDate(
                    state.statisticsDate
                ) || new Date();


            if (
                state.statisticsPeriod ===
                "month"
            ) {

                date.setMonth(
                    date.getMonth() - 1
                );

            }

            else if (
                state.statisticsPeriod ===
                "week"
            ) {

                date.setDate(
                    date.getDate() - 7
                );

            }

            else {

                date.setDate(
                    date.getDate() - 1
                );

            }


            state.statisticsDate =
                date;


            renderStatistics();

        };


    window.statisticsNext =
        function () {

            const state =
                getState();

            if (!state) {
                return;
            }


            const date =
                parseDate(
                    state.statisticsDate
                ) || new Date();


            if (
                state.statisticsPeriod ===
                "month"
            ) {

                date.setMonth(
                    date.getMonth() + 1
                );

            }

            else if (
                state.statisticsPeriod ===
                "week"
            ) {

                date.setDate(
                    date.getDate() + 7
                );

            }

            else {

                date.setDate(
                    date.getDate() + 1
                );

            }


            state.statisticsDate =
                date;


            renderStatistics();

        };


    /* =====================================================
       HELPERS
    ===================================================== */

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value;

        }

    }


    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function formatDate(
        value
    ) {

        const date =
            parseDate(value);


        if (!date) {
            return "";
        }


        return date.toLocaleDateString(
            "vi-VN"
        );

    }


    function formatShortDate(
        value
    ) {

        const date =
            parseDate(value);


        if (!date) {
            return "";
        }


        return `${String(
            date.getDate()
        ).padStart(2, "0")}/${String(
            date.getMonth() + 1
        ).padStart(2, "0")
            }`;

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                function () {

                    if (
                        getState()
                    ) {

                        renderStatistics();

                    }

                },
                150
            );

        }
    );

    /* =========================================================
   STATISTICS DATE PICKER
   ---------------------------------------------------------
   ✓ Click vào ngày / tháng / năm để mở bảng chọn
   ✓ Chọn ngày
   ✓ Chọn tháng
   ✓ Chọn năm
   ✓ Có nút Hôm nay
   ✓ Tự cập nhật statistics
   ✓ Không dùng new Date("YYYY-MM-DD")
   ✓ Không lỗi ngày 29/30/31
========================================================= */

    (function () {

        /* =====================================================
           CSS
        ===================================================== */

        function statisticsInjectDatePickerCSS() {

            if (
                document.getElementById(
                    "statisticsDatePickerCSS"
                )
            ) {
                return;
            }

            const style =
                document.createElement("style");

            style.id =
                "statisticsDatePickerCSS";

            style.textContent = `

            .statistics-date-picker {
                position: fixed;
                z-index: 999999;
                width: 320px;
                max-width: calc(100vw - 24px);
                background: var(--card-bg, #ffffff);
                color: var(--text-color, #111827);
                border: 1px solid rgba(0,0,0,.08);
                border-radius: 20px;
                padding: 16px;
                box-shadow:
                    0 20px 60px rgba(0,0,0,.18),
                    0 4px 16px rgba(0,0,0,.08);
                animation:
                    statisticsDatePickerShow
                    .18s ease;
            }

            @keyframes statisticsDatePickerShow {

                from {
                    opacity: 0;
                    transform: translateY(-6px) scale(.98);
                }

                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

            }


            .statistics-date-picker-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 14px;
            }


            .statistics-date-picker-title {
                font-size: 16px;
                font-weight: 800;
            }


            .statistics-date-picker-close {
                width: 32px;
                height: 32px;
                border: 0;
                border-radius: 10px;
                background: rgba(0,0,0,.06);
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
            }


            .statistics-date-picker-tabs {
                display: grid;
                grid-template-columns:
                    repeat(3, 1fr);
                gap: 6px;
                margin-bottom: 14px;
                padding: 4px;
                background: rgba(0,0,0,.05);
                border-radius: 12px;
            }


            .statistics-date-picker-tab {
                border: 0;
                background: transparent;
                border-radius: 9px;
                padding: 9px 6px;
                font-weight: 700;
                cursor: pointer;
                color: inherit;
            }


            .statistics-date-picker-tab.active {
                background: #ffffff;
                color: #2563eb;
                box-shadow:
                    0 2px 8px rgba(0,0,0,.08);
            }


            .statistics-date-picker-nav {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }


            .statistics-date-picker-nav button {
                width: 36px;
                height: 36px;
                border: 0;
                border-radius: 10px;
                background: rgba(37,99,235,.09);
                color: #2563eb;
                cursor: pointer;
                font-size: 18px;
                font-weight: 800;
            }


            .statistics-date-picker-current {
                font-weight: 800;
                font-size: 15px;
                text-align: center;
            }


            .statistics-date-picker-grid {
                display: grid;
                grid-template-columns:
                    repeat(7, 1fr);
                gap: 5px;
            }


            .statistics-date-picker-grid.year-grid {
                grid-template-columns:
                    repeat(4, 1fr);
            }


            .statistics-date-picker-day-name {
                text-align: center;
                font-size: 11px;
                font-weight: 800;
                color: #9ca3af;
                padding: 4px 0;
            }


            .statistics-date-picker-cell {
                min-height: 36px;
                border: 0;
                border-radius: 10px;
                background: transparent;
                cursor: pointer;
                font-weight: 700;
                color: inherit;
            }


            .statistics-date-picker-cell:hover {
                background: rgba(37,99,235,.10);
                color: #2563eb;
            }


            .statistics-date-picker-cell.selected {
                background: #2563eb;
                color: #ffffff;
            }


            .statistics-date-picker-cell.today {
                box-shadow:
                    inset 0 0 0 2px #2563eb;
            }


            .statistics-date-picker-cell.muted {
                color: #c4c9d1;
                cursor: default;
            }


            .statistics-date-picker-footer {
                display: flex;
                gap: 8px;
                margin-top: 14px;
            }


            .statistics-date-picker-footer button {
                flex: 1;
                border: 0;
                border-radius: 12px;
                padding: 10px;
                font-weight: 800;
                cursor: pointer;
            }


            .statistics-date-picker-today {
                background: #2563eb;
                color: white;
            }


            .statistics-date-picker-cancel {
                background: rgba(0,0,0,.06);
                color: inherit;
            }


            /* Phần ngày hiện tại có thể click */

            #statisticsPeriodLabel,
            #statisticsDateLabel,
            .statistics-date-clickable {
                cursor: pointer;
                user-select: none;
            }


            #statisticsPeriodLabel:hover,
            #statisticsDateLabel:hover,
            .statistics-date-clickable:hover {
                color: #2563eb;
            }


            /* Dark mode */

            .dark .statistics-date-picker,
            [data-theme="dark"] .statistics-date-picker,
            body.dark-mode .statistics-date-picker {
                background: #171a21;
                color: #f3f4f6;
                border-color: rgba(255,255,255,.08);
                box-shadow:
                    0 20px 60px rgba(0,0,0,.55);
            }


            .dark .statistics-date-picker-tabs,
            [data-theme="dark"] .statistics-date-picker-tabs,
            body.dark-mode .statistics-date-picker-tabs {
                background: rgba(255,255,255,.06);
            }


            .dark .statistics-date-picker-tab.active,
            [data-theme="dark"] .statistics-date-picker-tab.active,
            body.dark-mode .statistics-date-picker-tab.active {
                background: #252a34;
            }


            .dark .statistics-date-picker-close,
            [data-theme="dark"] .statistics-date-picker-close,
            body.dark-mode .statistics-date-picker-close {
                background: rgba(255,255,255,.08);
                color: #fff;
            }

        `;

            document.head.appendChild(style);

        }


        /* =====================================================
           STATE
        ===================================================== */

        let picker = null;

        let pickerView =
            "day";

        let pickerMonth =
            null;

        let pickerYear =
            null;


        /* =====================================================
           CREATE
        ===================================================== */

        function statisticsCreateDatePicker() {

            if (picker) {

                return picker;

            }

            picker =
                document.createElement("div");

            picker.id =
                "statisticsDatePicker";

            picker.className =
                "statistics-date-picker";

            picker.style.display =
                "none";

            document.body.appendChild(
                picker
            );

            return picker;

        }


        /* =====================================================
           FORMAT
        ===================================================== */

        function statisticsPickerMonthName(
            month
        ) {

            const names = [
                "Tháng 1",
                "Tháng 2",
                "Tháng 3",
                "Tháng 4",
                "Tháng 5",
                "Tháng 6",
                "Tháng 7",
                "Tháng 8",
                "Tháng 9",
                "Tháng 10",
                "Tháng 11",
                "Tháng 12"
            ];

            return names[month] || "";

        }


        /* =====================================================
           RENDER
        ===================================================== */

        function statisticsRenderDatePicker() {

            const box =
                statisticsCreateDatePicker();

            if (
                !pickerMonth &&
                pickerMonth !== 0
            ) {

                pickerMonth =
                    AppState.statisticsDate.getMonth();

            }

            if (!pickerYear) {

                pickerYear =
                    AppState.statisticsDate.getFullYear();

            }


            const selected =
                AppState.statisticsDate;


            const selectedDay =
                selected.getDate();

            const selectedMonth =
                selected.getMonth();

            const selectedYear =
                selected.getFullYear();


            let content = "";


            /* =================================================
               HEADER
            ================================================= */

            content += `

            <div class="
                statistics-date-picker-header
            ">

                <div class="
                    statistics-date-picker-title
                ">
                    Chọn thời gian
                </div>

                <button
                    type="button"
                    class="
                        statistics-date-picker-close
                    "
                    data-picker-action="close"
                >
                    ×
                </button>

            </div>

        `;


            /* =================================================
               TABS
            ================================================= */

            content += `

            <div class="
                statistics-date-picker-tabs
            ">

                <button
                    type="button"
                    class="
                        statistics-date-picker-tab
                        ${pickerView === "day"
                    ? "active"
                    : ""}
                    "
                    data-picker-view="day"
                >
                    Ngày
                </button>

                <button
                    type="button"
                    class="
                        statistics-date-picker-tab
                        ${pickerView === "month"
                    ? "active"
                    : ""}
                    "
                    data-picker-view="month"
                >
                    Tháng
                </button>

                <button
                    type="button"
                    class="
                        statistics-date-picker-tab
                        ${pickerView === "year"
                    ? "active"
                    : ""}
                    "
                    data-picker-view="year"
                >
                    Năm
                </button>

            </div>

        `;


            /* =================================================
               DAY
            ================================================= */

            if (
                pickerView === "day"
            ) {

                content += `

                <div class="
                    statistics-date-picker-nav
                ">

                    <button
                        type="button"
                        data-picker-action="prev-month"
                    >
                        ‹
                    </button>

                    <div class="
                        statistics-date-picker-current
                    ">
                        ${statisticsPickerMonthName(
                    pickerMonth
                )}
                        ${pickerYear}
                    </div>

                    <button
                        type="button"
                        data-picker-action="next-month"
                    >
                        ›
                    </button>

                </div>

            `;


                const firstDay =
                    new Date(
                        pickerYear,
                        pickerMonth,
                        1
                    );


                /*
                 * Monday = 0
                 */

                let startDay =
                    firstDay.getDay();

                startDay =
                    startDay === 0
                        ? 6
                        : startDay - 1;


                const daysInMonth =
                    new Date(
                        pickerYear,
                        pickerMonth + 1,
                        0
                    ).getDate();


                const daysInPreviousMonth =
                    new Date(
                        pickerYear,
                        pickerMonth,
                        0
                    ).getDate();


                content += `

                <div class="
                    statistics-date-picker-grid
                ">

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T2
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T3
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T4
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T5
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T6
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        T7
                    </div>

                    <div class="
                        statistics-date-picker-day-name
                    ">
                        CN
                    </div>

            `;


                /* Ngày tháng trước */

                for (
                    let i = startDay - 1;
                    i >= 0;
                    i--
                ) {

                    const day =
                        daysInPreviousMonth - i;

                    content += `

                    <button
                        type="button"
                        class="
                            statistics-date-picker-cell
                            muted
                        "
                        disabled
                    >
                        ${day}
                    </button>

                `;

                }


                /* Ngày hiện tại */

                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {

                    const isSelected =
                        day === selectedDay &&
                        pickerMonth === selectedMonth &&
                        pickerYear === selectedYear;


                    const now =
                        new Date();

                    const isToday =
                        day === now.getDate() &&
                        pickerMonth === now.getMonth() &&
                        pickerYear === now.getFullYear();


                    content += `

                    <button
                        type="button"
                        class="
                            statistics-date-picker-cell
                            ${isSelected
                            ? "selected"
                            : ""}
                            ${isToday
                            ? "today"
                            : ""}
                        "
                        data-picker-day="${day}"
                    >
                        ${day}
                    </button>

                `;

                }


                content += `

                </div>

            `;

            }


            /* =================================================
               MONTH
            ================================================= */

            if (
                pickerView === "month"
            ) {

                content += `

                <div class="
                    statistics-date-picker-nav
                ">

                    <button
                        type="button"
                        data-picker-action="prev-year"
                    >
                        ‹
                    </button>

                    <div class="
                        statistics-date-picker-current
                    ">
                        ${pickerYear}
                    </div>

                    <button
                        type="button"
                        data-picker-action="next-year"
                    >
                        ›
                    </button>

                </div>

            `;


                content += `

                <div
                    class="
                        statistics-date-picker-grid
                        year-grid
                    "
                >

            `;


                for (
                    let month = 0;
                    month < 12;
                    month++
                ) {

                    const isSelected =
                        month === selectedMonth &&
                        pickerYear === selectedYear;


                    content += `

                    <button
                        type="button"
                        class="
                            statistics-date-picker-cell
                            ${isSelected
                            ? "selected"
                            : ""}
                        "
                        data-picker-month="${month}"
                    >
                        ${statisticsPickerMonthName(
                                month
                            ).replace(
                                "Tháng ",
                                "T"
                            )}
                    </button>

                `;

                }


                content += `

                </div>

            `;

            }


            /* =================================================
               YEAR
            ================================================= */

            if (
                pickerView === "year"
            ) {

                const startYear =
                    Math.floor(
                        pickerYear / 12
                    ) * 12;


                content += `

                <div class="
                    statistics-date-picker-nav
                ">

                    <button
                        type="button"
                        data-picker-action="prev-year-page"
                    >
                        ‹
                    </button>

                    <div class="
                        statistics-date-picker-current
                    ">
                        ${startYear}
                        -
                        ${startYear + 11}
                    </div>

                    <button
                        type="button"
                        data-picker-action="next-year-page"
                    >
                        ›
                    </button>

                </div>

            `;


                content += `

                <div
                    class="
                        statistics-date-picker-grid
                        year-grid
                    "
                >

            `;


                for (
                    let year = startYear;
                    year <= startYear + 11;
                    year++
                ) {

                    const isSelected =
                        year === selectedYear;


                    content += `

                    <button
                        type="button"
                        class="
                            statistics-date-picker-cell
                            ${isSelected
                            ? "selected"
                            : ""}
                        "
                        data-picker-year="${year}"
                    >
                        ${year}
                    </button>

                `;

                }


                content += `

                </div>

            `;

            }


            /* =================================================
               FOOTER
            ================================================= */

            content += `

            <div class="
                statistics-date-picker-footer
            ">

                <button
                    type="button"
                    class="
                        statistics-date-picker-cancel
                    "
                    data-picker-action="close"
                >
                    Đóng
                </button>

                <button
                    type="button"
                    class="
                        statistics-date-picker-today
                    "
                    data-picker-action="today"
                >
                    Hôm nay
                </button>

            </div>

        `;


            box.innerHTML =
                content;


            statisticsPositionDatePicker();

        }


        /* =====================================================
           POSITION
        ===================================================== */

        function statisticsPositionDatePicker() {

            if (
                !picker ||
                picker.style.display === "none"
            ) {

                return;

            }


            const target =
                document.getElementById(
                    "statisticsPeriodLabel"
                ) ||
                document.getElementById(
                    "statisticsDateLabel"
                );


            if (!target) {

                picker.style.left =
                    "50%";

                picker.style.top =
                    "50%";

                picker.style.transform =
                    "translate(-50%, -50%)";

                return;

            }


            const rect =
                target.getBoundingClientRect();


            picker.style.transform =
                "none";


            let left =
                rect.left +
                rect.width / 2 -
                160;


            let top =
                rect.bottom +
                10;


            const maxLeft =
                window.innerWidth -
                picker.offsetWidth -
                12;


            const maxTop =
                window.innerHeight -
                picker.offsetHeight -
                12;


            left =
                Math.max(
                    12,
                    Math.min(
                        left,
                        maxLeft
                    )
                );


            if (
                top > maxTop
            ) {

                top =
                    rect.top -
                    picker.offsetHeight -
                    10;

            }


            top =
                Math.max(
                    12,
                    top
                );


            picker.style.left =
                left + "px";

            picker.style.top =
                top + "px";

        }


        /* =====================================================
           OPEN
        ===================================================== */

        function statisticsOpenDatePicker() {

            statisticsInjectDatePickerCSS();

            statisticsCreateDatePicker();


            statisticsNormalizeDate();


            pickerMonth =
                AppState.statisticsDate.getMonth();


            pickerYear =
                AppState.statisticsDate.getFullYear();


            /*
             * Nếu đang xem tháng
             * thì mở tab tháng.
             */

            if (
                AppState.statisticsPeriod ===
                "month"
            ) {

                pickerView =
                    "month";

            } else {

                pickerView =
                    "day";

            }


            picker.style.display =
                "block";


            statisticsRenderDatePicker();


            setTimeout(
                () => {

                    statisticsPositionDatePicker();

                },
                0
            );

        }


        /* =====================================================
           CLOSE
        ===================================================== */

        function statisticsCloseDatePicker() {

            if (!picker) {

                return;

            }


            picker.style.display =
                "none";

        }


        /* =====================================================
           SELECT DAY
        ===================================================== */

        function statisticsSelectDay(
            day
        ) {

            const safeDay =
                Math.min(
                    Number(day),
                    new Date(
                        pickerYear,
                        pickerMonth + 1,
                        0
                    ).getDate()
                );


            AppState.statisticsDate =
                statisticsCreateLocalDate(
                    pickerYear,
                    pickerMonth,
                    safeDay
                );


            /*
             * Chọn ngày => chế độ ngày
             */

            AppState.statisticsPeriod =
                "day";


            statisticsCloseDatePicker();

            renderStatistics();

        }


        /* =====================================================
           SELECT MONTH
        ===================================================== */

        function statisticsSelectMonth(
            month
        ) {

            pickerMonth =
                Number(month);


            /*
             * Đưa về ngày 1 để không lỗi
             * 29 / 30 / 31.
             */

            AppState.statisticsDate =
                statisticsCreateLocalDate(
                    pickerYear,
                    pickerMonth,
                    1
                );


            AppState.statisticsPeriod =
                "month";


            statisticsCloseDatePicker();

            renderStatistics();

        }


        /* =====================================================
           SELECT YEAR
        ===================================================== */

        function statisticsSelectYear(
            year
        ) {

            pickerYear =
                Number(year);


            /*
             * Nếu đang chọn năm,
             * giữ tháng hiện tại.
             */

            AppState.statisticsDate =
                statisticsCreateLocalDate(
                    pickerYear,
                    pickerMonth,
                    1
                );


            /*
             * Sau khi chọn năm,
             * chuyển sang chọn tháng.
             */

            pickerView =
                "month";


            statisticsRenderDatePicker();

        }


        /* =====================================================
           EVENTS PICKER
        ===================================================== */

        document.addEventListener(
            "click",
            function (event) {

                const target =
                    event.target;


                if (
                    target.closest(
                        "[data-picker-view]"
                    )
                ) {

                    const button =
                        target.closest(
                            "[data-picker-view]"
                        );


                    pickerView =
                        button.dataset
                            .pickerView;


                    statisticsRenderDatePicker();

                    return;

                }


                if (
                    target.closest(
                        "[data-picker-action]"
                    )
                ) {

                    const button =
                        target.closest(
                            "[data-picker-action]"
                        );


                    const action =
                        button.dataset
                            .pickerAction;


                    /* Đóng */

                    if (
                        action === "close"
                    ) {

                        statisticsCloseDatePicker();

                        return;

                    }


                    /* Hôm nay */

                    if (
                        action === "today"
                    ) {

                        statisticsToday();

                        statisticsCloseDatePicker();

                        return;

                    }


                    /* Tháng trước */

                    if (
                        action === "prev-month"
                    ) {

                        pickerMonth--;

                        if (
                            pickerMonth < 0
                        ) {

                            pickerMonth = 11;
                            pickerYear--;

                        }

                        statisticsRenderDatePicker();

                        return;

                    }


                    /* Tháng sau */

                    if (
                        action === "next-month"
                    ) {

                        pickerMonth++;

                        if (
                            pickerMonth > 11
                        ) {

                            pickerMonth = 0;
                            pickerYear++;

                        }

                        statisticsRenderDatePicker();

                        return;

                    }


                    /* Năm trước */

                    if (
                        action === "prev-year"
                    ) {

                        pickerYear--;

                        statisticsRenderDatePicker();

                        return;

                    }


                    /* Năm sau */

                    if (
                        action === "next-year"
                    ) {

                        pickerYear++;

                        statisticsRenderDatePicker();

                        return;

                    }


                    /* Trang năm trước */

                    if (
                        action ===
                        "prev-year-page"
                    ) {

                        pickerYear -= 12;

                        statisticsRenderDatePicker();

                        return;

                    }


                    /* Trang năm sau */

                    if (
                        action ===
                        "next-year-page"
                    ) {

                        pickerYear += 12;

                        statisticsRenderDatePicker();

                        return;

                    }

                }


                /* Chọn ngày */

                const dayButton =
                    target.closest(
                        "[data-picker-day]"
                    );


                if (dayButton) {

                    statisticsSelectDay(
                        dayButton.dataset
                            .pickerDay
                    );

                    return;

                }


                /* Chọn tháng */

                const monthButton =
                    target.closest(
                        "[data-picker-month]"
                    );


                if (monthButton) {

                    statisticsSelectMonth(
                        monthButton.dataset
                            .pickerMonth
                    );

                    return;

                }


                /* Chọn năm */

                const yearButton =
                    target.closest(
                        "[data-picker-year]"
                    );


                if (yearButton) {

                    statisticsSelectYear(
                        yearButton.dataset
                            .pickerYear
                    );

                    return;

                }


                /*
                 * Click bên ngoài => đóng.
                 */

                if (
                    picker &&
                    picker.style.display !== "none" &&
                    !target.closest(
                        "#statisticsDatePicker"
                    )
                ) {

                    const periodLabel =
                        document.getElementById(
                            "statisticsPeriodLabel"
                        );


                    const dateLabel =
                        document.getElementById(
                            "statisticsDateLabel"
                        );


                    if (
                        target !== periodLabel &&
                        !periodLabel?.contains(target) &&
                        target !== dateLabel &&
                        !dateLabel?.contains(target)
                    ) {

                        statisticsCloseDatePicker();

                    }

                }

            }
        );


        /* =====================================================
           CLICK LABEL
        ===================================================== */

        document.addEventListener(
            "click",
            function (event) {

                const label =
                    event.target.closest(
                        "#statisticsPeriodLabel, #statisticsDateLabel, .statistics-date-clickable"
                    );


                if (!label) {

                    return;

                }


                event.preventDefault();
                event.stopPropagation();


                statisticsOpenDatePicker();

            }
        );


        /* =====================================================
           RESIZE / SCROLL
        ===================================================== */

        window.addEventListener(
            "resize",
            function () {

                statisticsPositionDatePicker();

            }
        );


        window.addEventListener(
            "scroll",
            function () {

                statisticsPositionDatePicker();

            },
            true
        );


        /* =====================================================
           PUBLIC
        ===================================================== */

        window.statisticsOpenDatePicker =
            statisticsOpenDatePicker;

        window.statisticsCloseDatePicker =
            statisticsCloseDatePicker;

    })();

})();
