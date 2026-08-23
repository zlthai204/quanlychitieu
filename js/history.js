document.addEventListener(
    "input",
    event => {

        if (
            event.target.id ===
            "historySearch"
        ) {

            renderHistory();

        }

    }
);


document.addEventListener(
    "change",
    event => {

        if (
            event.target.id ===
                "historyTypeFilter" ||
            event.target.id ===
                "historySourceFilter"
        ) {

            renderHistory();

        }

    }
);


function renderHistory() {

    const container =
        document.getElementById(
            "historyList"
        );

    if (!container) return;


    const search =
        (
            document.getElementById(
                "historySearch"
            )?.value || ""
        )
            .toLowerCase()
            .trim();


    const type =
        document.getElementById(
            "historyTypeFilter"
        )?.value || "all";


    const source =
        document.getElementById(
            "historySourceFilter"
        )?.value || "all";


    const transactions =
        AppState.transactions.filter(
            transaction => {

                const text = [

                    transaction.dish_name,

                    transaction.category_name,

                    transaction.note,

                    transaction.source

                ]
                    .join(" ")
                    .toLowerCase();


                const matchSearch =
                    !search ||
                    text.includes(search);


                const matchType =
                    type === "all" ||
                    transaction.type === type;


                const matchSource =
                    source === "all" ||
                    transaction.source === source;


                return (
                    matchSearch &&
                    matchType &&
                    matchSource
                );

            }
        );


    setText(
        "historyCount",
        `${transactions.length} giao dịch`
    );


    if (!transactions.length) {

        container.innerHTML = `
            <div class="history-empty">
                Chưa có giao dịch.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    transactions.forEach(
        transaction => {

            const isIncome =
                transaction.type === "thu";


            container.innerHTML += `

                <div class="history-item">

                    <div class="
                        history-icon
                        ${isIncome ? "thu" : "chi"}
                    ">

                        ${isIncome ? "↑" : "↓"}

                    </div>


                    <div class="history-info">

                        <div class="history-name">

                            ${escapeHTML(
                                transaction.dish_name ||
                                "Giao dịch"
                            )}

                        </div>

                        <div class="history-category">

                            ${escapeHTML(
                                transaction.category_name || ""
                            )}

                        </div>

                        ${
                            isIncome
                                ? `
                                <div class="history-source">
                                    ${transaction.source || ""}
                                </div>
                                `
                                : ""
                        }

                        <div class="history-date">

                            ${formatVietnameseDate(
                                transaction.date
                            )}

                        </div>

                    </div>


                    <div class="history-right">

                        <div class="
                            history-money
                            ${isIncome
                                ? "green-text"
                                : "red-text"}
                        ">

                            ${isIncome ? "+" : "-"}
                            ${formatMoney(
                                transaction.amount
                            )}

                        </div>


                        <div class="history-actions">

                            <button
                                class="history-action-button"
                                onclick="
                                    editTransaction(
                                        '${transaction.id}'
                                    )
                                ">

                                ✏️

                            </button>

                            <button
                                class="history-action-button"
                                onclick="
                                    deleteTransaction(
                                        '${transaction.id}'
                                    )
                                ">

                                🗑️

                            </button>

                        </div>

                    </div>

                </div>

            `;

        }
    );

}


/* EDIT */

function editTransaction(id) {

    const transaction =
        AppState.transactions.find(
            t => String(t.id) === String(id)
        );

    if (!transaction) return;


    AppState.editingTransactionId =
        transaction.id;


    setTransactionType(
        transaction.type
    );


    document.getElementById(
        "transactionAmount"
    ).value =
        transaction.amount;


    document.getElementById(
        "transactionDate"
    ).value =
        transaction.date;


    document.getElementById(
        "transactionNote"
    ).value =
        transaction.note || "";


    document.getElementById(
        "transactionName"
    ).value =
        transaction.dish_name || "";


    document.getElementById(
        "appFee"
    ).value =
        transaction.app_fee || 0;


    setOrderSource(
        transaction.source ||
        "ShopeeFood"
    );


    document.getElementById(
        "cancelEditButton"
    ).style.display = "block";


    navigateTo("home");

}


function cancelEdit() {

    AppState.editingTransactionId =
        null;

    clearTransactionForm();

}


async function deleteTransaction(id) {

    if (
        !confirm(
            "Bạn có chắc muốn xóa giao dịch này?"
        )
    ) return;


    await dbDelete(
        "transactions",
        id
    );


    AppState.transactions =
        AppState.transactions.filter(
            t =>
                String(t.id) !==
                String(id)
        );


    renderAll();

    showToast(
        "Đã xóa giao dịch"
    );

}
