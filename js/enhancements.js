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
            multi.className = "transaction-dish-multi";
            select.parentNode.insertBefore(multi, select.nextSibling);
        }

        if (!categorySelect.value && !items.length) {
            multi.innerHTML = '<div class="field-help">Chưa có món phù hợp để chọn.</div>';
            AppState.selectedOrderItems = [];
            return;
        }

        multi.innerHTML = items.length ? items.map(d => {
            const old = previous.find(x => String(x.dish_id) === String(d.id));
            const checked = old ? "checked" : "";
            const qty = old?.qty || 1;
            return `
                <label class="order-dish-row">
                    <span class="order-dish-check">
                        <input type="checkbox" data-dish-id="${d.id}" data-dish-name="${escapeHTML(d.name || "")}" ${checked}>
                        <span>${escapeHTML(d.name || "Không tên")}</span>
                    </span>
                    <input type="number" min="1" step="1" value="${qty}" data-qty aria-label="Số lượng">
                    <strong>${typeof formatMoney === "function" ? formatMoney(dishCost(d)) : money(dishCost(d))}</strong>
                </label>`;
        }).join("") : '<div class="field-help">Danh mục này chưa có mục phù hợp.</div>';

        multi.querySelectorAll("input[data-dish-id], input[data-qty]").forEach(el => el.addEventListener("change", syncSelectedItemsFromUI));
        syncSelectedItemsFromUI();
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
    window.renderStatisticsDishes = function(transactions) {
        const container = document.getElementById("statisticsDishList");
        if (!container) return;
        const map = {};
        (transactions || []).filter(t => typeOf(t?.type) === "thu").forEach(t => {
            parseOrderItems(t).forEach(item => {
                const key = String(item.dish_id ?? item.dish_name);
                const currentDish = (AppState.dishes || []).find(d => String(d.id) === String(item.dish_id));
                const qty = Math.max(1, Number(item.qty) || 1);
                const unitCost = money(item.unit_cost) || dishCost(currentDish);
                if (!map[key]) map[key] = { name: item.dish_name || currentDish?.name || "Món", quantity: 0, cost: 0, orders: 0, revenue: 0 };
                map[key].quantity += qty;
                map[key].cost += unitCost * qty;
                map[key].orders += 1;
                // Revenue is intentionally not duplicated here across every item.
            });
        });
        const entries = Object.values(map).sort((a,b) => b.cost - a.cost);
        container.innerHTML = entries.length ? entries.map(x => `
            <div class="statistics-breakdown-row">
                <div><strong>${escapeHTML(x.name)}</strong><small>${x.orders} đơn · ${x.quantity} phần</small></div>
                <strong>${formatMoney(x.cost)}</strong>
            </div>`).join("") : '<div class="statistics-empty">Chưa có món trong kỳ này.</div>';
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
                if (itemType(item) !== "dish") text.innerHTML = "🧂 " + escapeHTML(item?.name || name);
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
