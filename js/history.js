/* =========================================================
   HISTORY — DETAILED LEDGER
   Search / filter / sort / totals / CSV export / per-order breakdown
========================================================= */
(function () {
    "use strict";

    const getState = () => (typeof AppState !== "undefined" ? AppState : window.AppState || {});
    const money = v => typeof window.parseMoneyValue === "function" ? Number(window.parseMoneyValue(v)) || 0 : Number(v) || 0;
    const fmt = v => typeof window.formatMoney === "function" ? window.formatMoney(money(v)) : money(v).toLocaleString("vi-VN") + " ₫";
    const esc = v => typeof window.escapeHTML === "function" ? window.escapeHTML(String(v ?? "")) : String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
    const type = v => String(v || "").trim().toLowerCase();
    const sourceKey = v => String(v || "").trim().toLowerCase();
    const isPlatform = v => ["shopeefood", "grabfood"].includes(sourceKey(v));
    const dateOnly = v => String(v || "").slice(0,10);

    function parseRecordedAt(t) {
        try {
            const n = String(t?.note || "");
            if (n.startsWith("[[ORDER_ITEMS]]")) {
                const payload = JSON.parse(n.slice("[[ORDER_ITEMS]]".length));
                if (payload?.recorded_at) return payload.recorded_at;
            }
        } catch {}
        return t?.created_at || t?.updated_at || "";
    }

    function dateTimeValue(t) {
        const raw = parseRecordedAt(t);
        if (raw) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) return d;
        }
        const d = new Date(dateOnly(t?.date) + "T12:00:00");
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
    }

    function formatDateTime(t) {
        const d = dateTimeValue(t);
        if (!d || d.getTime() === 0) return dateOnly(t?.date) || "Chưa có ngày";
        return new Intl.DateTimeFormat("vi-VN", {
            day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit"
        }).format(d);
    }

    function cleanNote(t) {
        if (typeof window.getTransactionDisplayNote === "function") return window.getTransactionDisplayNote(t) || "";
        const n = String(t?.note || "");
        if (!n.startsWith("[[ORDER_ITEMS]]")) return n;
        try { return JSON.parse(n.slice("[[ORDER_ITEMS]]".length))?.note || ""; } catch { return ""; }
    }

    function itemsOf(t) {
        if (typeof window.getTransactionOrderItems === "function") return window.getTransactionOrderItems(t) || [];
        if (Array.isArray(t?.items)) return t.items;
        return t?.dish_id || t?.dish_name ? [{ dish_id:t.dish_id, dish_name:t.dish_name, qty:1, unit_cost:0 }] : [];
    }

    function orderCost(t) {
        if (typeof window.getTransactionOrderCost === "function") return money(window.getTransactionOrderCost(t));
        if (typeof window.getTransactionDishCost === "function") return money(window.getTransactionDishCost(t));
        return 0;
    }

    function feeOf(t) { return isPlatform(t?.source) ? money(t?.app_fee) : 0; }
    function netOf(t) {
        const revenue = money(t?.amount);
        return type(t?.type) === "thu" ? revenue - orderCost(t) - feeOf(t) : -revenue;
    }

    function ensureTools() {
        const page = document.getElementById("historyPage");
        const card = page?.querySelector(".card");
        const list = document.getElementById("historyList");
        if (!page || !card || !list) return;
        if (document.getElementById("historyAdvancedTools")) return;

        const originalSearch = document.getElementById("historySearch");
        const originalFilters = card.querySelector(".history-filter-grid");
        const tools = document.createElement("div");
        tools.id = "historyAdvancedTools";
        tools.className = "history-advanced-tools";
        tools.innerHTML = `
            <div class="history-toolbar-row">
                <label><span>Từ ngày</span><input id="historyFromDate" type="date"></label>
                <label><span>Đến ngày</span><input id="historyToDate" type="date"></label>
                <label><span>Sắp xếp</span><select id="historySort"><option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option><option value="highest">Tiền cao → thấp</option><option value="lowest">Tiền thấp → cao</option></select></label>
                <button type="button" class="history-export-btn" id="historyExportBtn">Xuất CSV</button>
            </div>
            <div class="history-summary-strip">
                <div><span>TỔNG GIAO DỊCH</span><strong id="historyTotalCount">0</strong></div>
                <div><span>TỔNG THU</span><strong id="historyTotalIncome">0 ₫</strong></div>
                <div><span>TỔNG CHI</span><strong id="historyTotalExpense">0 ₫</strong></div>
                <div><span>THỰC NHẬN</span><strong id="historyTotalNet">0 ₫</strong></div>
            </div>`;
        if (originalSearch) originalSearch.insertAdjacentElement("afterend", tools);
        else if (originalFilters) originalFilters.insertAdjacentElement("beforebegin", tools);

        ["historySearch","historyTypeFilter","historySourceFilter","historyFromDate","historyToDate","historySort"].forEach(id => {
            document.getElementById(id)?.addEventListener("input", renderHistory);
            document.getElementById(id)?.addEventListener("change", renderHistory);
        });
        document.getElementById("historyExportBtn")?.addEventListener("click", exportCSV);
    }

    function filteredTransactions() {
        const state = getState();
        const search = String(document.getElementById("historySearch")?.value || "").trim().toLowerCase();
        const typeFilter = document.getElementById("historyTypeFilter")?.value || "all";
        const sourceFilter = document.getElementById("historySourceFilter")?.value || "all";
        const from = document.getElementById("historyFromDate")?.value || "";
        const to = document.getElementById("historyToDate")?.value || "";
        const sort = document.getElementById("historySort")?.value || "newest";
        let rows = Array.isArray(state.transactions) ? [...state.transactions] : [];

        rows = rows.filter(t => {
            const text = [t?.dish_name,t?.category_name,t?.note,t?.source].join(" ").toLowerCase();
            const d = dateOnly(t?.date);
            return (!search || text.includes(search)) &&
                (typeFilter === "all" || type(t?.type) === typeFilter) &&
                (sourceFilter === "all" || t?.source === sourceFilter) &&
                (!from || d >= from) && (!to || d <= to);
        });

        rows.sort((a,b) => {
            if (sort === "highest") return money(b?.amount) - money(a?.amount);
            if (sort === "lowest") return money(a?.amount) - money(b?.amount);
            const diff = dateTimeValue(b).getTime() - dateTimeValue(a).getTime();
            return sort === "oldest" ? -diff : diff;
        });
        return rows;
    }

    function renderSummary(rows) {
        const income = rows.filter(t => type(t?.type) === "thu");
        const expense = rows.filter(t => type(t?.type) === "chi");
        const incomeTotal = income.reduce((s,t)=>s+money(t.amount),0);
        const expenseTotal = expense.reduce((s,t)=>s+money(t.amount),0);
        const net = income.reduce((s,t)=>s+netOf(t),0) - expenseTotal;
        const set = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
        set("historyTotalCount", rows.length);
        set("historyTotalIncome", fmt(incomeTotal));
        set("historyTotalExpense", fmt(expenseTotal));
        set("historyTotalNet", fmt(net));
    }

    function renderRow(t, index) {
        const income = type(t?.type) === "thu";
        const revenue = money(t?.amount);
        const cost = income ? orderCost(t) : 0;
        const fee = income ? feeOf(t) : 0;
        const net = income ? revenue - cost - fee : -revenue;
        const items = income ? itemsOf(t) : [];
        const source = t?.source || (income ? "Ngoài sàn" : "");
        const itemRows = items.map(it => {
            const qty=Math.max(1,Number(it?.qty)||1);
            const unit=money(it?.unit_cost);
            return `<div class="history-detail-item"><div><strong>${esc(it?.dish_name||"Món")}</strong><span>${qty} phần</span></div><b>${fmt(unit*qty)}</b></div>`;
        }).join("");
        const note = cleanNote(t);
        return `<article class="history-premium-item ${income ? "income" : "expense"}">
            <div class="history-premium-main">
                <div class="history-premium-icon">${income ? "↑" : "↓"}</div>
                <div class="history-premium-content">
                    <div class="history-premium-title-row"><strong>${esc(t?.dish_name || t?.name || "Giao dịch")}</strong><span class="history-type-pill ${income?"income":"expense"}">${income?"THU":"CHI"}</span></div>
                    <div class="history-premium-meta"><span>🕒 ${esc(formatDateTime(t))}</span>${t?.category_name?`<span>📁 ${esc(t.category_name)}</span>`:""}${source?`<span class="history-source-pill">${esc(source)}</span>`:""}</div>
                    <div class="history-premium-id">Mã giao dịch: ${esc(t?.id ?? "—")}</div>
                </div>
                <div class="history-premium-amount"><span>${income?"TỔNG THU":"KHOẢN CHI"}</span><strong>${income?"+":"−"}${fmt(revenue)}</strong><button type="button" class="history-detail-toggle" data-history-expand="${index}">Chi tiết</button></div>
            </div>
            <div class="history-premium-detail" id="historyDetail-${index}" hidden>
                ${income ? `<div class="history-finance-grid"><div><span>Tổng tiền đơn</span><b>${fmt(revenue)}</b></div><div><span>Giá vốn</span><b>− ${fmt(cost)}</b></div><div><span>Chiết khấu app</span><b>${isPlatform(source)?"− "+fmt(fee):"0 ₫"}</b></div><div class="net"><span>Tiền thực nhận</span><b>${fmt(net)}</b></div></div>` : `<div class="history-finance-grid single"><div class="net"><span>Chi phí thực tế</span><b>− ${fmt(revenue)}</b></div></div>`}
                ${income && items.length ? `<div class="history-detail-section"><div class="history-detail-heading"><span>🍜 Món trong đơn</span><b>${items.reduce((s,it)=>s+Math.max(1,Number(it?.qty)||1),0)} phần</b></div>${itemRows}<div class="history-detail-total"><span>Tổng vốn đơn</span><strong>${fmt(cost)}</strong></div></div>` : ""}
                ${note ? `<div class="history-note-box"><span>Ghi chú</span><p>${esc(note)}</p></div>` : ""}
                <div class="history-detail-actions"><button type="button" onclick="editTransaction('${esc(t?.id)}')">✏️ Sửa</button><button type="button" class="danger" onclick="deleteTransaction('${esc(t?.id)}')">🗑️ Xóa</button></div>
            </div>
        </article>`;
    }

    function bindExpand() {
        document.querySelectorAll("[data-history-expand]").forEach(btn => btn.addEventListener("click", () => {
            const id = btn.dataset.historyExpand;
            const panel = document.getElementById(`historyDetail-${id}`);
            if (!panel) return;
            const willOpen = panel.hidden;
            panel.hidden = !willOpen;
            btn.textContent = willOpen ? "Thu gọn" : "Chi tiết";
        }));
    }

    function renderHistory() {
        ensureTools();
        const list = document.getElementById("historyList");
        if (!list) return;
        const rows = filteredTransactions();
        renderSummary(rows);
        const count = document.getElementById("historyCount");
        if (count) count.textContent = `${rows.length} giao dịch · mới nhất ở trên`;
        if (!rows.length) {
            list.innerHTML = `<div class="history-premium-empty"><div>🧾</div><strong>Không tìm thấy giao dịch</strong><span>Thử đổi bộ lọc hoặc khoảng thời gian.</span></div>`;
            return;
        }
        list.innerHTML = rows.map(renderRow).join("");
        bindExpand();
    }

    function exportCSV() {
        const rows = filteredTransactions();
        const header = ["ID","Loại","Ngày giờ","Danh mục","Nguồn","Tên","Tổng tiền","Giá vốn","Chiết khấu app","Thực nhận","Ghi chú"];
        const lines = [header, ...rows.map(t => [
            t?.id ?? "", type(t?.type)==="thu"?"Thu":"Chi", formatDateTime(t), t?.category_name||"", t?.source||"",
            t?.dish_name||t?.name||"", money(t?.amount), type(t?.type)==="thu"?orderCost(t):money(t?.amount), type(t?.type)==="thu"?feeOf(t):0, type(t?.type)==="thu"?netOf(t):-money(t?.amount), cleanNote(t)
        ])].map(row => row.map(v => `"${String(v??"").replaceAll('"','""')}"`).join(","));
        const blob = new Blob(["\ufeff" + lines.join("\n")], {type:"text/csv;charset=utf-8"});
        const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`lich-su-giao-dich-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    }

    // Preserve the global API used by the rest of the app.
    window.renderHistory = renderHistory;

    document.addEventListener("click", e => {
        if (e.target.matches("[data-history-expand]")) return; // handled after render
    });
    document.addEventListener("DOMContentLoaded", () => setTimeout(renderHistory, 120));
})();

/* =========================================================
   EDIT / DELETE
========================================================= */
function editTransaction(id) {
    const transaction = AppState.transactions.find(t => String(t.id) === String(id));
    if (!transaction) return;
    AppState.editingTransactionId = transaction.id;
    if (typeof editTransactionEnhanced === "function") editTransactionEnhanced(transaction);
    else {
        setTransactionType(transaction.type);
        document.getElementById("transactionAmount").value = transaction.amount;
        document.getElementById("transactionDate").value = transaction.date;
        document.getElementById("transactionNote").value = transaction.note || "";
        document.getElementById("transactionName").value = transaction.dish_name || "";
        document.getElementById("appFee").value = transaction.app_fee || 0;
        setOrderSource(transaction.source || "ShopeeFood");
        document.getElementById("cancelEditButton").style.display = "block";
        navigateTo("home");
    }
    if (typeof navigateTo === "function") navigateTo("home");
}

function cancelEdit() {
    AppState.editingTransactionId = null;
    if (typeof clearTransactionForm === "function") clearTransactionForm();
}

async function deleteTransaction(id) {
    if (!confirm("Bạn có chắc muốn xóa giao dịch này?")) return;
    try {
        await dbDelete("transactions", id);
        AppState.transactions = AppState.transactions.filter(t => String(t.id) !== String(id));
        renderAll();
        if (typeof showToast === "function") showToast("Đã xóa giao dịch");
    } catch (e) { console.error(e); }
}
