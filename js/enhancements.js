/* =========================================================
   THU CHI - ENHANCEMENTS
   Multi-item order + platform fee + date picker + item types
========================================================= */

(function () {
    const ORDER_MARKER = "[[ORDER_ITEMS]]";

    function money(v) {
        if (typeof parseMoneyValue === "function") return parseMoneyValue(v);
        return Number(String(v ?? 0).replace(/[^0-9.-]/g, "")) || 0;
    }

    function typeOf(t) { return String(t ?? "").trim().toLowerCase(); }

    function dishCost(dish) {
        if (typeof getDishCostFromDish === "function") return getDishCostFromDish(dish);
        if (!dish) return 0;
        let parts = dish.cod_parts;
        if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts = []; } }
        return Array.isArray(parts) ? parts.reduce((s, p) => s + money(p?.amount ?? p?.cost ?? p?.price), 0) : 0;
    }

    function itemType(dish) {
        if (!dish) return "dish";
        const raw = String(dish.type || dish.item_type || "").trim().toLowerCase();
        if (raw) return raw;
        let parts = dish.cod_parts;
        if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts = []; } }
        if (Array.isArray(parts) && parts.some(p => p && (p.__item_type === "expense" || p.item_type === "expense"))) return "expense";
        return "dish";
    }

    function parseOrderItems(transaction) {
        if (!transaction) return [];
        const note = String(transaction.note || "");
        if (note.startsWith(ORDER_MARKER)) {
            try {
                const payload = JSON.parse(note.slice(ORDER_MARKER.length));
                if (Array.isArray(payload?.items)) return payload.items;
            } catch (e) { console.warn("Không đọc được order items", e); }
        }
        if (transaction.dish_id || transaction.dish_name) {
            const dish = (AppState.dishes || []).find(d => String(d.id) === String(transaction.dish_id)) ||
                         (AppState.dishes || []).find(d => String(d.name || "").trim().toLowerCase() === String(transaction.dish_name || "").trim().toLowerCase());
            return [{
                dish_id: transaction.dish_id ?? null,
                dish_name: transaction.dish_name || "Giao dịch",
                category_id: transaction.category_id ?? null,
                category_name: transaction.category_name || "",
                qty: 1,
                unit_cost: dishCost(dish)
            }];
        }
        return [];
    }

    function cleanUserNote(note) {
        const text = String(note || "");
        if (!text.startsWith(ORDER_MARKER)) return text;
        try { return JSON.parse(text.slice(ORDER_MARKER.length))?.note || ""; } catch { return ""; }
    }

    function orderCost(transaction) {
        const items = parseOrderItems(transaction);
        if (!items.length) return 0;
        return items.reduce((sum, item) => {
            const currentDish = (AppState.dishes || []).find(d => String(d.id) === String(item.dish_id));
            const unit = money(item.unit_cost) || dishCost(currentDish);
            const qty = Math.max(1, Number(item.qty) || 1);
            return sum + unit * qty;
        }, 0);
    }

    window.getTransactionOrderItems = parseOrderItems;
    window.getTransactionDisplayNote = cleanUserNote;
    window.getTransactionOrderCost = orderCost;

    // Override the shared single-dish resolver with multi-item aware logic.
    window.getTransactionDishCost = orderCost;

    if (typeof AppState !== "undefined") {
        AppState.selectedOrderItems = AppState.selectedOrderItems || [];
    }

    function currentCategoryItems() {
        const categoryId = document.getElementById("transactionCategory")?.value || "";
        return (AppState.dishes || []).filter(d => {
            if (categoryId && String(d.category_id) !== String(categoryId)) return false;
            const t = itemType(d);
            return typeOf(AppState.transactionType) === "chi" ? (t === "expense" || t === "ingredient" || t === "nguyenlieu") : !(t === "expense" || t === "ingredient" || t === "nguyenlieu");
        });
    }

    function selectedIds() {
        return new Set((AppState.selectedOrderItems || []).map(x => String(x.dish_id)));
    }

    function syncSelectedItemsFromUI() {
        const boxes = document.querySelectorAll("#transactionDishMulti input[data-dish-id]");
        const map = new Map((AppState.dishes || []).map(d => [String(d.id), d]));
        const items = [];
        boxes.forEach(box => {
            if (!box.checked) return;
            const dish = map.get(String(box.dataset.dishId));
            const qtyEl = box.closest(".order-dish-row")?.querySelector("input[data-qty]");
            const qty = Math.max(1, parseInt(qtyEl?.value || "1", 10) || 1);
            items.push({
                dish_id: dish?.id ?? box.dataset.dishId,
                dish_name: dish?.name || box.dataset.dishName || "Món",
                category_id: dish?.category_id ?? null,
                category_name: (AppState.categories || []).find(c => String(c.id) === String(dish?.category_id))?.name || "",
                qty,
                unit_cost: dishCost(dish)
            });
        });
        AppState.selectedOrderItems = items;
    }

    window.renderTransactionDishes = function renderTransactionDishesEnhanced() {
        const categorySelect = document.getElementById("transactionCategory");
        const select = document.getElementById("transactionDish");
        if (!categorySelect || !select) return;

        const previous = (AppState.selectedOrderItems || []).map(x => ({ ...x }));
        const items = currentCategoryItems();

        select.style.display = "none";
        let multi = document.getElementById("transactionDishMulti");
        if (!multi) {
            multi = document.createElement("div");
            multi.id = "transactionDishMulti";
            multi.className = "transaction-dish-multi modern-picker";
            select.parentNode.insertBefore(multi, select.nextSibling);
        }

        if (!categorySelect.value) {
            multi.innerHTML = `<div class="picker-empty-state"><div class="picker-empty-icon">📂</div><strong>Chọn danh mục trước</strong><span>Sau khi chọn danh mục, chỉ món thuộc danh mục đó sẽ xuất hiện ở đây.</span></div>`;
            return;
        }

        multi.innerHTML = `
            <div class="picker-toolbar">
                <div><strong>${AppState.transactionType === "chi" ? "Chọn khoản chi" : "Chọn món trong danh mục"}</strong><small>Chọn món, nhập số lượng rồi tiếp tục thêm món khác.</small></div>
                <span class="picker-count">${items.length} mục</span>
            </div>
            <div class="transaction-picker-grid">
            ${items.length ? items.map(d => {
                const old = previous.find(x => String(x.dish_id) === String(d.id));
                const checked = old ? "checked" : "";
                const qty = Math.max(1, Number(old?.qty) || 1);
                const cost = dishCost(d);
                return `
                <div class="order-dish-card ${old ? "is-selected" : ""}">
                    <label class="order-dish-main">
                        <input type="checkbox" data-dish-id="${d.id}" data-dish-name="${escapeHTML(d.name || "")}" ${checked}>
                        <span class="dish-checkmark">✓</span>
                        <span class="dish-copy"><strong>${escapeHTML(d.name || "Không tên")}</strong><small>${AppState.transactionType === "chi" ? "Khoản chi / nguyên liệu" : "Giá vốn đã khai báo"}</small></span>
                    </label>
                    <div class="dish-quick-row">
                        <span class="dish-cost">${typeof formatMoney === "function" ? formatMoney(cost) : money(cost)} / món</span>
                        <label class="qty-field"><span>SL</span><input type="number" min="1" step="1" value="${qty}" data-qty aria-label="Số lượng"></label>
                    </div>
                </div>`;
            }).join("") : `<div class="picker-empty-state compact"><div class="picker-empty-icon">🍜</div><strong>Chưa có mục trong danh mục</strong><span>Vào trang Quán để thêm món hoặc khoản chi.</span></div>`}
            </div>`;

        multi.querySelectorAll("input[data-dish-id]").forEach(box => box.addEventListener("change", e => {
            const id = String(e.target.dataset.dishId);
            const map = new Map((AppState.selectedOrderItems || []).map(x => [String(x.dish_id), { ...x }]));
            const dish = (AppState.dishes || []).find(d => String(d.id) === id);
            if (e.target.checked) {
                const qtyEl = e.target.closest(".order-dish-card")?.querySelector("input[data-qty]");
                map.set(id, {
                    dish_id: dish?.id ?? id,
                    dish_name: dish?.name || e.target.dataset.dishName || "Món",
                    category_id: dish?.category_id ?? null,
                    category_name: (AppState.categories || []).find(c => String(c.id) === String(dish?.category_id))?.name || "",
                    qty: Math.max(1, parseInt(qtyEl?.value || "1", 10) || 1),
                    unit_cost: dishCost(dish)
                });
            } else map.delete(id);
            AppState.selectedOrderItems = [...map.values()];
            renderSelectedOrderItems();
            window.renderTransactionDishes();
        }));

        multi.querySelectorAll("input[data-qty]").forEach(q => q.addEventListener("change", e => {
            const row = e.target.closest(".order-dish-card");
            const box = row?.querySelector("input[data-dish-id]");
            if (!box?.checked) return;
            const map = new Map((AppState.selectedOrderItems || []).map(x => [String(x.dish_id), { ...x }]));
            const item = map.get(String(box.dataset.dishId));
            if (!item) return;
            item.qty = Math.max(1, parseInt(e.target.value || "1", 10) || 1);
            AppState.selectedOrderItems = [...map.values()];
            renderSelectedOrderItems();
        }));

        renderSelectedOrderItems();
    };
    const oldSetType = window.setTransactionType;
    window.setTransactionType = function(type) {
        if (oldSetType) oldSetType(type);
        setTimeout(() => window.renderTransactionDishes(), 0);
    };

    const oldRenderCats = window.renderTransactionCategories;
    window.renderTransactionCategories = function() {
        if (oldRenderCats) oldRenderCats();
        const select = document.getElementById("transactionCategory");
        if (select) select.addEventListener("change", () => setTimeout(() => window.renderTransactionDishes(), 0), { once: true });
    };

    window.renderHome = function () {
        if (typeof renderTransactionCategories === "function") renderTransactionCategories();
        window.renderTransactionDishes();
        if (typeof renderHomeSummary === "function") renderHomeSummary();
    };

    window.calculateHomeCODCost = function (transactions) {
        return (transactions || []).reduce((sum, t) => typeOf(t?.type) === "thu" ? sum + orderCost(t) : sum, 0);
    };

    // Save one row per order. The note contains a machine-readable items list;
    // app fee remains a single value for the whole order.
    window.saveTransaction = async function saveTransactionEnhanced() {
        syncSelectedItemsFromUI();
        const categoryId = document.getElementById("transactionCategory")?.value || "";
        const customName = document.getElementById("transactionName")?.value?.trim() || "";
        const amount = money(document.getElementById("transactionAmount")?.value);
        const appFee = money(document.getElementById("appFee")?.value);
        const date = document.getElementById("transactionDate")?.value || (typeof getLocalDateString === "function" ? getLocalDateString() : "");
        const userNote = document.getElementById("transactionNote")?.value?.trim() || "";
        const items = (AppState.selectedOrderItems || []).map(x => ({ ...x }));
        const category = (AppState.categories || []).find(c => String(c.id) === String(categoryId));
        const firstDish = items[0] ? (AppState.dishes || []).find(d => String(d.id) === String(items[0].dish_id)) : null;

        if (amount <= 0) return showToast("Vui lòng nhập số tiền");
        if (typeOf(AppState.transactionType) === "thu" && !items.length && !customName) return showToast("Chọn ít nhất 1 món");

        const notePayload = {
            note: userNote,
            items,
            version: 1
        };
        const note = ORDER_MARKER + JSON.stringify(notePayload);
        const displayName = items.length ? items.map(x => `${x.dish_name}${Number(x.qty) > 1 ? ` ×${x.qty}` : ""}`).join(" + ") : (customName || "Giao dịch");

        const payload = {
            type: AppState.transactionType,
            category_id: categoryId || firstDish?.category_id || null,
            dish_id: firstDish?.id || null,
            category_name: category?.name || (AppState.categories || []).find(c => String(c.id) === String(firstDish?.category_id))?.name || "",
            dish_name: displayName,
            source: AppState.transactionType === "thu" ? AppState.orderSource : null,
            amount,
            app_fee: AppState.transactionType === "thu" ? appFee : 0,
            date,
            note
        };

        try {
            if (AppState.editingTransactionId) await dbUpdate("transactions", AppState.editingTransactionId, payload);
            else await dbInsert("transactions", payload);
            AppState.transactions = await dbGet("transactions", { order: { column: "date", ascending: false } });
            if (typeof clearTransactionForm === "function") clearTransactionForm();
            else window.clearTransactionForm();
            renderAll();
            showToast(AppState.editingTransactionId ? "Đã cập nhật giao dịch" : "Đã lưu giao dịch");
        } catch (e) { console.error(e); }
    };

    const oldClear = window.clearTransactionForm;
    window.clearTransactionForm = function() {
        if (oldClear) oldClear();
        AppState.selectedOrderItems = [];
        const multi = document.getElementById("transactionDishMulti");
        if (multi) multi.querySelectorAll("input[data-dish-id]").forEach(x => x.checked = false);
        window.renderTransactionDishes();
        if (typeof setToday === "function") setToday();
    };

    window.editTransactionEnhanced = function(transaction) {
        AppState.selectedOrderItems = parseOrderItems(transaction);
        if (typeof setTransactionType === "function") setTransactionType(typeOf(transaction.type) || "thu");
        const categorySelect = document.getElementById("transactionCategory");
        if (categorySelect) categorySelect.value = transaction.category_id || AppState.selectedOrderItems[0]?.category_id || "";
        window.renderTransactionDishes();
        const amountEl = document.getElementById("transactionAmount"); if (amountEl) amountEl.value = transaction.amount || 0;
        const dateEl = document.getElementById("transactionDate"); if (dateEl) dateEl.value = String(transaction.date || "").slice(0, 10);
        const noteEl = document.getElementById("transactionNote"); if (noteEl) noteEl.value = cleanUserNote(transaction.note);
        const nameEl = document.getElementById("transactionName"); if (nameEl) nameEl.value = transaction.dish_name || "";
        const feeEl = document.getElementById("appFee"); if (feeEl) feeEl.value = transaction.app_fee || 0;
        if (typeof setOrderSource === "function") setOrderSource(transaction.source || "ShopeeFood");
    };

    // Statistics: reliable platform fees and multi-item costs.
    window.getStatisticsOrderCost = orderCost;

    // Add a dedicated date picker to the statistics period card.
    function ensureStatisticsDatePicker() {
        const row = document.querySelector(".statistics-date-row");
        if (!row || document.getElementById("statisticsDatePicker")) return;
        const input = document.createElement("input");
        input.type = "date";
        input.id = "statisticsDatePicker";
        input.title = "Chọn ngày / tháng / năm";
        input.className = "statistics-date-picker";
        input.addEventListener("change", () => {
            if (typeof statisticsStringToDate === "function") {
                const d = statisticsStringToDate(input.value);
                if (d) { AppState.statisticsDate = d; if (typeof renderStatistics === "function") renderStatistics(); }
            }
        });
        row.appendChild(input);
    }

    const baseRenderStatistics = window.renderStatistics;
    window.renderStatistics = function enhancedRenderStatistics() {
        ensureStatisticsDatePicker();
        if (baseRenderStatistics) baseRenderStatistics();
        const input = document.getElementById("statisticsDatePicker");
        if (input && typeof statisticsDateToString === "function") input.value = statisticsDateToString(AppState.statisticsDate);
    };

    // Replace statistics' cost calculation with quantity-aware order calculation.
    window.calculatePeriodCODCost = function(transactions) {
        return (transactions || []).reduce((sum, t) => typeOf(t?.type) === "thu" ? sum + orderCost(t) : sum, 0);
    };

    // Statistics income detail: one order can contain many items.
    // Statistics income detail: show EACH ORDER with revenue, cost, platform fee and net received.
    window.renderStatisticsDishes = function(transactions) {
        const container = document.getElementById("statisticsDishList");
        if (!container) return;

        const income = (transactions || []).filter(t => typeOf(t?.type) === "thu");
        if (!income.length) {
            container.innerHTML = '<div class="statistics-empty">Chưa có đơn bán trong kỳ này.</div>';
            return;
        }

        const feeSource = (source) => {
            const s = String(source || "").trim().toLowerCase();
            return s === "shopeefood" || s === "grabfood";
        };

        const sourceLabel = (source) => {
            const s = String(source || "Ngoài sàn").trim();
            if (s === "ShopeeFood") return "ShopeeFood";
            if (s === "GrabFood") return "GrabFood";
            return "Ngoài sàn";
        };

        const sourceClass = (source) => {
            const s = String(source || "").toLowerCase();
            if (s === "shopeefood") return "shopee";
            if (s === "grabfood") return "grab";
            return "outside";
        };

        const escape = (value) => {
            if (typeof escapeHTML === "function") return escapeHTML(String(value ?? ""));
            return String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
        };

        const formatDate = (value) => {
            const text = String(value || "").slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text || "";
            const [y, m, d] = text.split("-");
            return `${d}/${m}/${y}`;
        };

        container.innerHTML = income.map((transaction, index) => {
            const items = parseOrderItems(transaction);
            const revenue = money(transaction.amount);
            const cost = orderCost(transaction);
            const source = sourceLabel(transaction.source);
            const platformFee = feeSource(transaction.source) ? money(transaction.app_fee) : 0;
            const netReceived = revenue - cost - platformFee;
            const itemText = items.length
                ? items.map(item => {
                    const qty = Math.max(1, Number(item.qty) || 1);
                    const currentDish = (AppState.dishes || []).find(d => String(d.id) === String(item.dish_id));
                    const unitCost = money(item.unit_cost) || dishCost(currentDish);
                    const itemCost = unitCost * qty;
                    return `<div class="statistics-order-item">
                        <span class="statistics-order-item-name">${escape(item.dish_name || currentDish?.name || "Món")}</span>
                        <span class="statistics-order-item-qty">×${qty}</span>
                        <span class="statistics-order-item-cost">${typeof formatMoney === "function" ? formatMoney(itemCost) : money(itemCost)}</span>
                    </div>`;
                }).join("")
                : `<div class="statistics-order-item"><span>${escape(transaction.dish_name || transaction.name || "Đơn hàng")}</span></div>`;

            const profitClass = netReceived >= 0 ? "positive" : "negative";
            const icon = source === "ShopeeFood" ? "🟠" : source === "GrabFood" ? "🟢" : "🔵";

            return `
                <article class="statistics-order-card">
                    <div class="statistics-order-head">
                        <div class="statistics-order-title-wrap">
                            <div class="statistics-order-title">${icon} Đơn #${index + 1}</div>
                            <div class="statistics-order-meta">
                                <span>${escape(source)}</span>
                                <span>${formatDate(transaction.date)}</span>
                            </div>
                        </div>
                        <div class="statistics-order-net ${profitClass}">
                            <small>THỰC NHẬN</small>
                            <strong>${typeof formatMoney === "function" ? formatMoney(netReceived) : money(netReceived)}</strong>
                        </div>
                    </div>

                    <div class="statistics-order-items">
                        ${itemText}
                    </div>

                    <div class="statistics-order-breakdown">
                        <div class="statistics-order-money-row">
                            <span>Tổng tiền đơn</span>
                            <strong>${typeof formatMoney === "function" ? formatMoney(revenue) : money(revenue)}</strong>
                        </div>
                        <div class="statistics-order-money-row cost-row">
                            <span>− Giá vốn</span>
                            <strong>− ${typeof formatMoney === "function" ? formatMoney(cost) : money(cost)}</strong>
                        </div>
                        <div class="statistics-order-money-row fee-row">
                            <span>− Chiết khấu app${feeSource(transaction.source) ? ` (${escape(source)})` : ""}</span>
                            <strong>− ${typeof formatMoney === "function" ? formatMoney(platformFee) : money(platformFee)}</strong>
                        </div>
                        <div class="statistics-order-money-row total-row">
                            <span>Tiền thực nhận</span>
                            <strong class="${profitClass}">${typeof formatMoney === "function" ? formatMoney(netReceived) : money(netReceived)}</strong>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    };

    // Home editing helper is used by history.js override below.
    window._enhancementsLoaded = true;
})();

/* =========================================================
   RESTAURANT ITEM TYPE UI
========================================================= */
(function () {
    function ensureTypeField() {
        const name = document.getElementById("newDishName");
        if (!name || document.getElementById("newDishType")) return;
        const select = document.createElement("select");
        select.id = "newDishType";
        select.innerHTML = '<option value="dish">🍜 Món bán</option><option value="expense">🧂 Nguyên liệu / khoản chi</option>';
        name.parentNode.insertBefore(select, name);
    }
    document.addEventListener("DOMContentLoaded", ensureTypeField);
    const oldAddDish = window.addDish;
    window.addDish = async function () {
        ensureTypeField();
        const type = document.getElementById("newDishType")?.value || "dish";
        const categoryId = document.getElementById("dishCategorySelect")?.value || "";
        const name = document.getElementById("newDishName")?.value?.trim() || "";
        if (!categoryId || !name) return showToast(!categoryId ? "Chọn danh mục" : "Nhập tên mục");
        try {
            await dbInsert("dishes", { category_id: categoryId, name, type });
        } catch (e) {
            // Compatibility with an older dishes table without a type column.
            if (e?.message && /type|column/i.test(e.message)) {
                if (type === "expense") {
                    await dbInsert("dishes", { category_id: categoryId, name, cod_parts: [{ __item_type: "expense", amount: 0 }] });
                } else {
                    await dbInsert("dishes", { category_id: categoryId, name });
                }
            } else throw e;
        }
        document.getElementById("newDishName").value = "";
        AppState.dishes = await dbGet("dishes");
        if (typeof renderRestaurant === "function") renderRestaurant();
        if (typeof renderCOD === "function") renderCOD();
        showToast(type === "expense" ? "Đã thêm nguyên liệu / khoản chi" : "Đã thêm món");
    };

    const oldRenderRestaurant = window.renderRestaurant;
    window.renderRestaurant = function () {
        if (oldRenderRestaurant) oldRenderRestaurant();
        ensureTypeField();
        const count = document.querySelector("#restaurantMenuList");
        if (count) {
            count.querySelectorAll(".restaurant-dish").forEach(row => {
                const text = row.querySelector(".restaurant-dish-name");
                if (!text) return;
                const name = text.textContent.trim();
                const item = (AppState.dishes || []).find(d => name.includes(String(d.name || "").trim()));
                const rawType = String(item?.type || item?.item_type || "").trim().toLowerCase();
                let parts = item?.cod_parts;
                if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts = []; } }
                const isExpense = rawType === "expense" || rawType === "ingredient" || rawType === "nguyenlieu" ||
                    (Array.isArray(parts) && parts.some(p => p && (p.__item_type === "expense" || p.item_type === "expense")));
                if (isExpense) text.innerHTML = "🧂 " + escapeHTML(item?.name || name);
            });
        }
    };
})();

/* =========================================================
   HISTORY / EDIT: preserve multi-item orders
========================================================= */
(function () {
    const oldRenderHistory = window.renderHistory;
    window.renderHistory = function () {
        if (oldRenderHistory) oldRenderHistory();
        document.querySelectorAll("#historyList .history-item").forEach(item => {
            // no-op: existing history renderer remains intact; note cleanup is in a small post-pass.
        });
    };

    window.editTransaction = function (id) {
        const transaction = (AppState.transactions || []).find(t => String(t.id) === String(id));
        if (!transaction) return;
        AppState.editingTransactionId = transaction.id;
        if (typeof editTransactionEnhanced === "function") editTransactionEnhanced(transaction);
        const cancel = document.getElementById("cancelEditButton");
        if (cancel) cancel.style.display = "block";
        if (typeof navigateTo === "function") navigateTo("home");
    };
})();


/* =========================================================
   COD: only sellable dishes
========================================================= */
(function () {
    function isExpenseDish(d) {
        const raw = String(d?.type || d?.item_type || "").trim().toLowerCase();
        if (raw === "expense" || raw === "ingredient" || raw === "nguyenlieu") return true;
        let parts = d?.cod_parts;
        if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts = []; } }
        return Array.isArray(parts) && parts.some(p => p && (p.__item_type === "expense" || p.item_type === "expense"));
    }
    const oldShowCODDishes = window.showCODDishes;
    window.showCODDishes = function(categoryId) {
        if (oldShowCODDishes) oldShowCODDishes(categoryId);
        setTimeout(() => {
            const list = document.getElementById("codDishList");
            if (!list) return;
            list.querySelectorAll(".cod-dish").forEach(btn => {
                const text = btn.textContent || "";
                const d = (AppState.dishes || []).find(x => text.includes(String(x.name || "")));
                if (d && isExpenseDish(d)) btn.remove();
            });
            if (!list.children.length) list.innerHTML = '<div class="history-empty">Danh mục này chưa có món bán.</div>';
        }, 0);
    };
})();

/* =========================================================
   FINAL UX PASS - CATEGORY TYPES + MULTI ITEM PICKER + COD COPY
========================================================= */
(function () {
    const CATEGORY_TYPE_KEY = "bep_nha_duyen_category_types_v2";

    function loadCategoryTypes() {
        try { return JSON.parse(localStorage.getItem(CATEGORY_TYPE_KEY) || "{}"); }
        catch { return {}; }
    }
    function saveCategoryTypes(map) {
        try { localStorage.setItem(CATEGORY_TYPE_KEY, JSON.stringify(map)); } catch {}
    }
    let categoryTypes = loadCategoryTypes();

    function categoryHasExpenseItems(categoryId) {
        return (AppState.dishes || []).some(d => String(d.category_id) === String(categoryId) && isExpenseItem(d));
    }
    function isExpenseItem(dish) {
        const raw = String(dish?.type || dish?.item_type || "").trim().toLowerCase();
        if (["chi", "expense", "ingredient", "nguyenlieu"].includes(raw)) return true;
        let parts = dish?.cod_parts;
        if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts = []; } }
        return Array.isArray(parts) && parts.some(p => ["chi", "expense", "ingredient", "nguyenlieu"].includes(String(p?.__item_type || p?.item_type || "").toLowerCase()));
    }
    function getCategoryType(category) {
        if (!category) return "thu";
        const raw = String(category.type || category.item_type || category.kind || "").trim().toLowerCase();
        if (["chi","expense","ingredient","nguyenlieu"].includes(raw)) return "chi";
        if (raw === "thu" || raw === "dish" || raw === "ban") return "thu";
        if (categoryTypes[String(category.id)]) return categoryTypes[String(category.id)];
        return categoryHasExpenseItems(category.id) ? "chi" : "thu";
    }

    window.getCategoryType = getCategoryType;
    window.isExpenseItem = isExpenseItem;

    let restaurantCategoryType = "thu";
    window.setRestaurantCategoryType = function(type) {
        restaurantCategoryType = type === "chi" ? "chi" : "thu";
        document.querySelectorAll("#restaurantCategoryTypeSwitch .restaurant-type-button").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.type === restaurantCategoryType);
        });
        if (typeof renderRestaurant === "function") renderRestaurant();
    };

    function syncRestaurantCategoryControls() {
        document.querySelectorAll("#restaurantCategoryTypeSwitch .restaurant-type-button").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.type === restaurantCategoryType);
        });
    }

    // Category creation: type belongs to category, not dish.
    window.addCategory = async function () {
        const input = document.getElementById("newCategoryName");
        const name = input?.value?.trim() || "";
        if (!name) return showToast("Nhập tên danh mục");
        const type = restaurantCategoryType;
        let created = null;
        try {
            created = await dbInsert("categories", { name, type });
        } catch (e) {
            // Backward-compatible with categories table that has no type column.
            created = await dbInsert("categories", { name });
        }
        const id = created?.id ?? created?.[0]?.id;
        if (id != null) { categoryTypes[String(id)] = type; saveCategoryTypes(categoryTypes); }
        input.value = "";
        AppState.categories = await dbGet("categories", { order: { column: "created_at", ascending: true } });
        syncRestaurantCategoryControls();
        if (typeof renderRestaurant === "function") renderRestaurant();
        showToast(type === "chi" ? "Đã thêm danh mục khoản chi" : "Đã thêm danh mục món bán");
    };

    window.addDish = async function () {
        const categoryId = document.getElementById("dishCategorySelect")?.value || "";
        const input = document.getElementById("newDishName");
        const name = input?.value?.trim() || "";
        if (!categoryId) return showToast("Chọn danh mục");
        if (!name) return showToast("Nhập tên món / nguyên liệu");
        const category = (AppState.categories || []).find(c => String(c.id) === String(categoryId));
        const type = getCategoryType(category);
        const payload = { category_id: categoryId, name };
        try {
            payload.type = type === "chi" ? "expense" : "dish";
            await dbInsert("dishes", payload);
        } catch (e) {
            const fallback = { category_id: categoryId, name };
            if (type === "chi") fallback.cod_parts = [{ __item_type: "expense", amount: 0 }];
            await dbInsert("dishes", fallback);
        }
        input.value = "";
        AppState.dishes = await dbGet("dishes", { order: { column: "created_at", ascending: true } });
        if (typeof renderRestaurant === "function") renderRestaurant();
        if (typeof renderCOD === "function") renderCOD();
        showToast(type === "chi" ? "Đã thêm khoản chi / nguyên liệu" : "Đã thêm món bán");
    };

    // Restaurant renderer: category card itself is labelled Thu/Chi and dish type is inherited.
    const baseRenderRestaurant = window.renderRestaurant;
    window.renderRestaurant = function () {
        if (baseRenderRestaurant) baseRenderRestaurant();
        const select = document.getElementById("dishCategorySelect");
        if (!select) return;
        select.innerHTML = '<option value="">Chọn danh mục</option>' + (AppState.categories || []).map(c => {
            const type = getCategoryType(c);
            const prefix = type === "chi" ? "❤️" : "💚";
            return `<option value="${c.id}" data-type="${type}">${prefix} ${escapeHTML(c.name)}</option>`;
        }).join("");
        syncRestaurantCategoryControls();
    };

    // Replace transaction category/dish rendering with a persistent multi-order picker.
    function selectedMap() {
        return new Map((AppState.selectedOrderItems || []).map(x => [String(x.dish_id), { ...x }]));
    }
    function selectedDishIds() { return [...selectedMap().keys()]; }

    window.renderTransactionCategories = function () {
        const select = document.getElementById("transactionCategory");
        if (!select) return;
        const wantedType = String(AppState.transactionType || "thu").toLowerCase() === "chi" ? "chi" : "thu";
        const current = select.value;
        const cats = (AppState.categories || []).filter(c => getCategoryType(c) === wantedType);
        select.innerHTML = `<option value="">${wantedType === "chi" ? "Chọn danh mục khoản chi" : "Chọn danh mục món"}</option>` +
            cats.map(c => `<option value="${c.id}">${wantedType === "chi" ? "❤️" : "💚"} ${escapeHTML(c.name)}</option>`).join("");
        if (cats.some(c => String(c.id) === String(current))) select.value = current;
        else select.value = "";
    };

    function availableTransactionItems() {
        const wantedType = String(AppState.transactionType || "thu").toLowerCase() === "chi" ? "chi" : "thu";
        const catId = document.getElementById("transactionCategory")?.value || "";
        return (AppState.dishes || []).filter(d => {
            const itemType = isExpenseItem(d) ? "chi" : "thu";
            if (itemType !== wantedType) return false;
            const belongs = !!catId && String(d.category_id) === String(catId);
            return belongs;
        });
    }

    function ensureSelectedOrderPanel() {
        let panel = document.getElementById("selectedOrderItemsPanel");
        const multi = document.getElementById("transactionDishMulti");
        if (!multi) return null;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "selectedOrderItemsPanel";
            panel.className = "selected-order-items-panel";
            multi.parentNode.insertBefore(panel, multi);
        }
        return panel;
    }

    function renderSelectedOrderItems() {
        const panel = ensureSelectedOrderPanel();
        if (!panel) return;
        const items = AppState.selectedOrderItems || [];
        if (!items.length) {
            panel.innerHTML = '<div class="selected-order-empty">Chưa có món nào trong đơn. Chọn món bên dưới, nhập số lượng rồi có thể tiếp tục chọn món khác.</div>';
            return;
        }
        panel.innerHTML = `
            <div class="selected-order-header"><strong>🧾 Món trong đơn</strong><span>${items.reduce((s,x)=>s+(Number(x.qty)||1),0)} phần</span></div>
            <div class="selected-order-list">${items.map((x,i)=>`
                <div class="selected-order-row">
                    <div><strong>${escapeHTML(x.dish_name || "Món")}</strong><small>${escapeHTML(x.category_name || "")}</small></div>
                    <div class="selected-order-qty"><button type="button" onclick="changeSelectedOrderQty(${i},-1)">−</button><input type="number" min="1" value="${Math.max(1,Number(x.qty)||1)}" onchange="setSelectedOrderQty(${i},this.value)"><button type="button" onclick="changeSelectedOrderQty(${i},1)">+</button></div>
                    <strong>${formatMoney((Number(x.unit_cost)||0)*(Math.max(1,Number(x.qty)||1)))}</strong>
                    <button type="button" class="selected-order-remove" onclick="removeSelectedOrderItem(${i})">×</button>
                </div>`).join("")}</div>`;
    }

    window.changeSelectedOrderQty = function(i, delta) {
        if (!AppState.selectedOrderItems?.[i]) return;
        AppState.selectedOrderItems[i].qty = Math.max(1, (Number(AppState.selectedOrderItems[i].qty)||1) + delta);
        renderSelectedOrderItems();
        renderTransactionDishes();
    };
    window.setSelectedOrderQty = function(i, value) {
        if (!AppState.selectedOrderItems?.[i]) return;
        AppState.selectedOrderItems[i].qty = Math.max(1, parseInt(value,10)||1);
        renderSelectedOrderItems();
    };
    window.removeSelectedOrderItem = function(i) {
        AppState.selectedOrderItems.splice(i,1);
        renderSelectedOrderItems();
        renderTransactionDishes();
    };

    window.renderTransactionDishes = function () {
        const select = document.getElementById("transactionDish");
        const category = document.getElementById("transactionCategory");
        if (!select || !category) return;
        select.style.display = "none";
        let multi = document.getElementById("transactionDishMulti");
        if (!multi) {
            multi = document.createElement("div");
            multi.id = "transactionDishMulti";
            multi.className = "transaction-dish-multi modern-picker";
            select.parentNode.insertBefore(multi, select.nextSibling);
        }
        const items = availableTransactionItems();
        const chosen = selectedMap();
        const totalSelected = (AppState.selectedOrderItems || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        multi.innerHTML = `
            <div class="picker-toolbar">
                <div>
                    <strong>Chọn món trong đơn</strong>
                    <small>Chọn món, đặt số lượng rồi tiếp tục thêm món từ danh mục khác.</small>
                </div>
                <span class="picker-count">${totalSelected} phần</span>
            </div>
            <div class="transaction-picker-grid">${items.length ? items.map(d=>{
                const checked = chosen.has(String(d.id));
                const qty = checked ? (Number(chosen.get(String(d.id)).qty)||1) : 1;
                const cost = typeof getDishCostFromDish==='function' ? getDishCostFromDish(d) : 0;
                return `<div class="order-dish-card ${checked?'is-selected':''}">
                    <label class="order-dish-main">
                        <input type="checkbox" data-dish-id="${d.id}" ${checked?'checked':''}>
                        <span class="dish-checkmark">✓</span>
                        <span class="dish-copy"><strong>${escapeHTML(d.name)}</strong><small>${escapeHTML((AppState.categories||[]).find(c=>String(c.id)===String(d.category_id))?.name||"")}</small></span>
                    </label>
                    <div class="dish-quick-row">
                        <span class="dish-cost">Vốn: ${formatMoney(cost)}</span>
                        <label class="qty-field">SL <input type="number" min="1" step="1" value="${qty}" data-qty aria-label="Số lượng"></label>
                    </div>
                </div>`;
            }).join("") : '<div class="picker-empty"><span>🍽️</span><strong>Chưa có món trong danh mục này</strong><small>Hãy chọn danh mục khác hoặc thêm món mới.</small></div>'}</div>`;
        multi.querySelectorAll("input[data-dish-id]").forEach(cb => cb.addEventListener("change", e=>{
            const id=String(e.target.dataset.dishId); const map=selectedMap();
            const dish=(AppState.dishes||[]).find(d=>String(d.id)===id);
            if(e.target.checked){ const qtyEl=e.target.closest('.order-dish-card')?.querySelector('input[data-qty]'); map.set(id,{dish_id:dish.id,dish_name:dish.name,category_id:dish.category_id,category_name:(AppState.categories||[]).find(c=>String(c.id)===String(dish.category_id))?.name||"",qty:Math.max(1,parseInt(qtyEl?.value||1,10)||1),unit_cost:typeof getDishCostFromDish==='function'?getDishCostFromDish(dish):0}); }
            else map.delete(id);
            AppState.selectedOrderItems=[...map.values()]; renderSelectedOrderItems(); renderTransactionDishes();
        }));
        multi.querySelectorAll("input[data-qty]").forEach(q=>q.addEventListener("change", e=>{
            const row=e.target.closest('.order-dish-card'); const cb=row?.querySelector('input[data-dish-id]'); if(!cb) return;
            const map=selectedMap(); if(!map.has(String(cb.dataset.dishId))) return;
            map.get(String(cb.dataset.dishId)).qty=Math.max(1,parseInt(e.target.value||1,10)||1); AppState.selectedOrderItems=[...map.values()]; renderSelectedOrderItems(); renderTransactionDishes();
        }));
        renderSelectedOrderItems();
    };

    const baseSetType = window.setTransactionType;
    window.setTransactionType = function(type) {
        if (baseSetType) baseSetType(type);
        AppState.transactionType = type === "chi" ? "chi" : "thu";
        // Switching Thu/Chi clears the category picker only, not already selected items.
        window.renderTransactionCategories();
        window.renderTransactionDishes();
        document.getElementById("transactionName")?.setAttribute("placeholder", AppState.transactionType === "chi" ? "Tên khoản chi khác" : "Tên món / khoản");
    };

    document.addEventListener("DOMContentLoaded", () => {
        const category = document.getElementById("transactionCategory");
        if (category) category.addEventListener("change", () => window.renderTransactionDishes());
        window.setRestaurantCategoryType(restaurantCategoryType);
        window.renderTransactionCategories();
        window.renderTransactionDishes();
    });

    // COD: copy all parts from another sellable dish.
    function fillCODSourceSelect() {
        const select = document.getElementById("codCopySourceDish");
        if (!select || !window.currentCODDishId) return;
        const currentId = String(window.currentCODDishId);
        const dishes = (AppState.dishes||[]).filter(d=>!isExpenseItem(d) && String(d.id)!==currentId);
        select.innerHTML = '<option value="">Chọn món nguồn</option>' + dishes.map(d=>`<option value="${d.id}">${escapeHTML(d.name)}</option>`).join("");
    }
    const oldShowCODDetail = window.showCODDetail;
    window.showCODDetail = function(dishId) {
        if (oldShowCODDetail) oldShowCODDetail(dishId);
        window.currentCODDishId = dishId;
        setTimeout(fillCODSourceSelect, 0);
    };
    window.copyCODFromSelectedDish = function() {
        const sourceId = document.getElementById("codCopySourceDish")?.value;
        if (!sourceId) return showToast("Chọn món nguồn");
        const source = (AppState.dishes||[]).find(d=>String(d.id)===String(sourceId));
        if (!source) return showToast("Không tìm thấy món nguồn");
        let parts = source.cod_parts || [];
        if (typeof parts === "string") { try { parts = JSON.parse(parts); } catch { parts=[]; } }
        if (!Array.isArray(parts) || !parts.length) return showToast("Món nguồn chưa có giá vốn");
        // currentCODParts is declared in cod.js and can be replaced safely here.
        currentCODParts = JSON.parse(JSON.stringify(parts));
        if (typeof renderCODParts === "function") renderCODParts();
        if (typeof calculateCOD === "function") calculateCOD();
        showToast(`Đã sao chép ${parts.length} thành phần`);
    };

})();

/* Restaurant menu type filter */
(function(){
    let menuFilterType = "thu";
    window.setRestaurantMenuFilter = function(type){
        menuFilterType = type === "chi" ? "chi" : "thu";
        document.querySelectorAll("#restaurantMenuFilter .restaurant-menu-filter-button").forEach(b=>b.classList.toggle("active",b.dataset.type===menuFilterType));
        window.renderRestaurant?.();
    };
    const previousRender = window.renderRestaurant;
    window.renderRestaurant = function(){
        if(previousRender) previousRender();
        const container=document.getElementById("restaurantMenuList");
        if(!container) return;
        container.querySelectorAll(".restaurant-category").forEach(cat=>{
            const title=cat.querySelector(".restaurant-category-name")?.textContent||"";
            // Recover category id from its delete button, then use the authoritative type resolver.
            const del=cat.querySelector(".restaurant-category-actions button");
            const m=del?.getAttribute("onclick")?.match(/'([^']+)'/);
            const c=(AppState.categories||[]).find(x=>m&&String(x.id)===String(m[1]));
            cat.style.display=getCategoryType(c)===menuFilterType?"":"none";
        });
        document.querySelectorAll("#restaurantMenuFilter .restaurant-menu-filter-button").forEach(b=>b.classList.toggle("active",b.dataset.type===menuFilterType));
    };
})();

/* =========================================================
   MODERN TRANSACTION FORM UX
========================================================= */
(function(){
    const css = document.createElement('style');
    css.id = 'modern-transaction-form-css';
    css.textContent = `
    .transaction-card{overflow:visible!important}
    .transaction-card .field-label{letter-spacing:.04em}
    .transaction-card #transactionCategory{font-size:16px;font-weight:700;border:1px solid #dfe3ea;border-radius:16px;min-height:52px;padding:0 16px;background:#fff;box-shadow:0 6px 20px rgba(15,23,42,.05)}
    .modern-picker{margin-top:10px}
    .picker-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;margin-bottom:10px;border:1px solid #e8ebf0;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}
    .picker-toolbar strong{display:block;font-size:14px;color:#172033}
    .picker-toolbar small{display:block;margin-top:3px;color:#7b8495;font-size:12px}
    .picker-count{white-space:nowrap;font-size:12px;font-weight:800;padding:7px 10px;border-radius:999px;background:#fff0e8;color:#f15b2a}
    .transaction-picker-grid{display:grid;grid-template-columns:1fr;gap:10px}
    .order-dish-card{border:1px solid #e6e9ef;border-radius:17px;padding:13px;background:#fff;transition:.18s ease;box-shadow:0 5px 18px rgba(15,23,42,.04)}
    .order-dish-card:hover{transform:translateY(-1px);border-color:#ffb48f;box-shadow:0 8px 24px rgba(241,91,42,.09)}
    .order-dish-card.is-selected{border-color:#f15b2a;background:#fffaf7;box-shadow:0 9px 28px rgba(241,91,42,.10)}
    .order-dish-main{display:flex;align-items:center;gap:11px;cursor:pointer}
    .order-dish-main input{position:absolute;opacity:0;pointer-events:none}
    .dish-checkmark{width:26px;height:26px;border-radius:9px;border:1.5px solid #cfd5df;display:grid;place-items:center;color:transparent;background:#fff;font-size:15px;font-weight:900;flex:none;transition:.18s}
    .order-dish-card.is-selected .dish-checkmark{background:#f15b2a;border-color:#f15b2a;color:#fff}
    .dish-copy{min-width:0}.dish-copy strong{display:block;font-size:15px;color:#182033}.dish-copy small{display:block;margin-top:3px;color:#8992a3;font-size:12px}
    .dish-quick-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:11px;padding-top:10px;border-top:1px dashed #e3e7ed}
    .dish-cost{font-size:12px;font-weight:800;color:#38536b}
    .qty-field{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;color:#7c8596}.qty-field input{width:66px;height:38px;border:1px solid #dfe4eb;border-radius:11px;text-align:center;font-weight:800;background:#fff}
    .selected-order-items-panel{margin:10px 0 12px;padding:14px;border-radius:18px;background:#111827;color:#fff;box-shadow:0 12px 30px rgba(15,23,42,.13)}
    .selected-order-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font-size:13px}.selected-order-header span{font-size:11px;opacity:.72}
    .selected-order-row{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,.1)}
    .selected-order-row strong{font-size:13px}.selected-order-row small{display:block;color:#aeb7c5;font-size:11px;margin-top:2px}
    .selected-order-qty{display:flex;align-items:center;gap:4px}.selected-order-qty button{width:28px;height:28px;border:0;border-radius:8px;background:rgba(255,255,255,.11);color:#fff}.selected-order-qty input{width:46px;height:28px;border:0;border-radius:8px;text-align:center;font-weight:800}
    .selected-order-remove{width:28px;height:28px;border:0;border-radius:8px;background:rgba(239,68,68,.15);color:#ff8a8a;font-size:18px}
    .selected-order-empty,.picker-empty-state{border:1px dashed #d9dee7;border-radius:16px;padding:18px;text-align:center;background:#fbfcfd;color:#737d8d}
    .picker-empty-icon{font-size:24px;margin-bottom:5px}.picker-empty-state strong{display:block;color:#374151}.picker-empty-state span{display:block;font-size:12px;margin-top:4px}.picker-empty-state.compact{padding:22px}
    @media (min-width:700px){.transaction-picker-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (max-width:560px){.picker-toolbar{align-items:flex-start;flex-direction:column}.selected-order-row{grid-template-columns:1fr auto}.selected-order-row>.selected-order-qty{grid-column:1}.selected-order-row>.selected-order-remove{grid-column:2;grid-row:2}.selected-order-row>strong{grid-column:1/3}}
    `;
    document.head.appendChild(css);
})();
