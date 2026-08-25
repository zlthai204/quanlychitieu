let currentCODCategoryId = null;

let currentCODDishId = null;

let currentCODParts = [];


/* =========================
   MAIN
========================= */

function renderCOD() {

    showCODCategories();

}


/* =========================
   CATEGORY
========================= */

function showCODCategories() {

    currentCODCategoryId = null;

    currentCODDishId = null;


    document.getElementById(
        "codCategoryView"
    ).style.display = "block";


    document.getElementById(
        "codDishView"
    ).style.display = "none";


    document.getElementById(
        "codDetailView"
    ).style.display = "none";


    renderCODCategories();

}


function renderCODCategories() {

    const container =
        document.getElementById(
            "codCategoryList"
        );


    if (!container) return;


    container.innerHTML = "";


    AppState.categories.forEach(
        category => {

            const dishes =
                AppState.dishes.filter(
                    dish =>
                        String(
                            dish.category_id
                        ) ===
                        String(category.id)
                );


            container.innerHTML += `

                <button
                    class="cod-category"
                    onclick="
                        showCODDishes(
                            '${category.id}'
                        )
                    ">

                    <div class="cod-category-left">

                        <div class="cod-folder">
                            📁
                        </div>

                        <div>

                            <div class="
                                cod-category-name
                            ">
                                ${escapeHTML(
                                    category.name
                                )}
                            </div>

                            <div class="
                                cod-category-count
                            ">
                                ${dishes.length} món
                            </div>

                        </div>

                    </div>

                    <span>
                        →
                    </span>

                </button>

            `;

        }
    );

}


/* =========================
   DISH
========================= */

function showCODDishes(
    categoryId = currentCODCategoryId
) {

    currentCODCategoryId =
        categoryId;


    document.getElementById(
        "codCategoryView"
    ).style.display = "none";


    document.getElementById(
        "codDishView"
    ).style.display = "block";


    document.getElementById(
        "codDetailView"
    ).style.display = "none";


    const category =
        AppState.categories.find(
            c =>
                String(c.id) ===
                String(categoryId)
        );


    setText(
        "codDishTitle",
        `🍜 ${category?.name || "Món"}`
    );


    renderCODDishes();

}


function renderCODDishes() {

    const container =
        document.getElementById(
            "codDishList"
        );


    const dishes =
        AppState.dishes.filter(
            dish =>
                String(
                    dish.category_id
                ) ===
                String(
                    currentCODCategoryId
                )
        );


    container.innerHTML = "";


    dishes.forEach(
        dish => {

            const cost =
                getDishCost(dish);


            container.innerHTML += `

                <button
                    class="cod-dish"
                    onclick="
                        showCODDetail(
                            '${dish.id}'
                        )
                    ">

                    <div>

                        <div class="
                            cod-dish-name
                        ">
                            🍜
                            ${escapeHTML(
                                dish.name
                            )}
                        </div>

                        <div class="
                            cod-dish-info
                        ">
                            Xem thành phần
                        </div>

                    </div>

                    <strong class="
                        cod-dish-cost
                    ">
                        ${formatMoney(cost)}
                    </strong>

                </button>

            `;

        }
    );

}


/* =========================
   DETAIL
========================= */

function showCODDetail(
    dishId
) {

    currentCODDishId =
        dishId;


    document.getElementById(
        "codCategoryView"
    ).style.display = "none";


    document.getElementById(
        "codDishView"
    ).style.display = "none";


    document.getElementById(
        "codDetailView"
    ).style.display = "block";


    const dish =
        AppState.dishes.find(
            d =>
                String(d.id) ===
                String(dishId)
        );


    if (!dish) return;


    setText(
        "codDishName",
        dish.name
    );


    const category =
        AppState.categories.find(
            c =>
                String(c.id) ===
                String(dish.category_id)
        );


    setText(
        "codDishCategory",
        category?.name || ""
    );


    document.getElementById(
        "codSellingPrice"
    ).value =
        dish.selling_price || "";


    currentCODParts =
        dish.cod_parts || [];


    renderCODParts();

    calculateCOD();

}


/* =========================
   PARTS
========================= */

function renderCODParts() {

    const container =
        document.getElementById(
            "codPartList"
        );


    container.innerHTML = "";


    currentCODParts.forEach(
        (part, index) => {

            container.innerHTML += `

                <div class="cod-part">

                    <div class="cod-part-icon">
                        📦
                    </div>

                    <div class="cod-part-info">

                        <div class="cod-part-name">
                            ${escapeHTML(
                                part.name
                            )}
                        </div>

                        <div class="cod-part-note">
                            ${escapeHTML(
                                part.note || ""
                            )}
                        </div>

                    </div>

                    <strong class="
                        cod-part-money
                    ">
                        ${formatMoney(
                            part.amount
                        )}
                    </strong>

                    <button
                        class="cod-part-delete"
                        onclick="
                            deleteCODPart(
                                ${index}
                            )
                        ">

                        ×

                    </button>

                </div>

            `;

        }
    );


    setText(
        "codPartCount",
        `${currentCODParts.length} phần`
    );

}


function addCODPart() {

    const name =
        document.getElementById(
            "codPartName"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "codPartAmount"
            ).value
        );


    const note =
        document.getElementById(
            "codPartNote"
        ).value.trim();


    if (!name) {

        showToast(
            "Nhập tên thành phần"
        );

        return;

    }


    if (!amount || amount < 0) {

        showToast(
            "Nhập giá thành phần"
        );

        return;

    }


    currentCODParts.push({

        name,

        amount,

        note

    });


    document.getElementById(
        "codPartName"
    ).value = "";

    document.getElementById(
        "codPartAmount"
    ).value = "";

    document.getElementById(
        "codPartNote"
    ).value = "";


    renderCODParts();

    calculateCOD();

}


function deleteCODPart(index) {

    currentCODParts.splice(
        index,
        1
    );

    renderCODParts();

    calculateCOD();

}


/* =========================
   CALCULATE
========================= */

function getDishCost(dish) {

    return (
        dish.cod_parts || []
    ).reduce(
        (sum, part) =>
            sum +
            Number(
                part.amount || 0
            ),
        0
    );

}


function calculateCOD() {

    const totalCost =
        currentCODParts.reduce(
            (sum, part) =>
                sum +
                Number(
                    part.amount || 0
                ),
            0
        );


    const sellingPrice =
        Number(
            document.getElementById(
                "codSellingPrice"
            )?.value
        ) || 0;


    const profit =
        sellingPrice -
        totalCost;


    setText(
        "codTotalCost",
        formatMoney(totalCost)
    );


    setText(
        "codDishProfit",
        formatMoney(profit)
    );

}


/* =========================
   SAVE
========================= */

async function saveCODDish() {

    if (!currentCODDishId) {

        showToast(
            "Chưa chọn món"
        );

        return;

    }


    const sellingPrice =
        Number(
            document.getElementById(
                "codSellingPrice"
            ).value
        ) || 0;


    await dbUpdate(
        "dishes",
        currentCODDishId,
        {

            selling_price:
                sellingPrice,

            cod_parts:
                currentCODParts

        }
    );


    const dish =
        AppState.dishes.find(
            d =>
                String(d.id) ===
                String(currentCODDishId)
        );


    if (dish) {

        dish.selling_price =
            sellingPrice;

        dish.cod_parts =
            currentCODParts;

    }


    showToast(
        "Đã lưu giá vốn món"
    );

    renderCODDishes();

}


/* =========================
   HELPERS
========================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


function formatMoney(value) {

    return Number(value || 0)
        .toLocaleString("vi-VN") +
        " ₫";

}


function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function formatVietnameseDate(
    dateString
) {

    if (!dateString) return "";

    const [
        year,
        month,
        day
    ] =
        dateString.split("-");


    return `${day}/${month}/${year}`;

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            })[char]
        );

}
