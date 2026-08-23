 function renderRestaurant() {

    const categorySelect =
        document.getElementById(
            "dishCategorySelect"
        );

    const container =
        document.getElementById(
            "restaurantMenuList"
        );


    if (!categorySelect ||
        !container) return;


    categorySelect.innerHTML = `
        <option value="">
            Chọn danh mục
        </option>
    `;


    AppState.categories.forEach(
        category => {

            categorySelect.innerHTML += `

                <option value="${category.id}">
                    ${escapeHTML(category.name)}
                </option>

            `;

        }
    );


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

                <div class="restaurant-category">

                    <div class="
                        restaurant-category-header
                    ">

                        <div>

                            <div class="
                                restaurant-category-name
                            ">
                                📁
                                ${escapeHTML(category.name)}
                            </div>

                            <div class="
                                restaurant-category-count
                            ">
                                ${dishes.length} món
                            </div>

                        </div>

                        <div class="
                            restaurant-category-actions
                        ">

                            <button
                                onclick="
                                    deleteCategory(
                                        '${category.id}'
                                    )
                                ">

                                🗑️

                            </button>

                        </div>

                    </div>


                    <div class="restaurant-dishes">

                        ${
                            dishes.length
                                ? dishes.map(
                                    dish => `

                                    <div class="restaurant-dish">

                                        <span class="
                                            restaurant-dish-name
                                        ">
                                            🍜
                                            ${escapeHTML(
                                                dish.name
                                            )}
                                        </span>

                                        <button
                                            class="
                                                restaurant-dish-delete
                                            "
                                            onclick="
                                                deleteDish(
                                                    '${dish.id}'
                                                )
                                            ">

                                            🗑️

                                        </button>

                                    </div>

                                `
                                ).join("")
                                : `
                                    <div class="
                                        history-empty
                                    ">
                                        Chưa có món.
                                    </div>
                                `
                        }

                    </div>

                </div>

            `;

        }
    );


    setText(
        "restaurantCount",
        `${AppState.dishes.length} món`
    );

}


/* ADD CATEGORY */

async function addCategory() {

    const input =
        document.getElementById(
            "newCategoryName"
        );

    const name =
        input.value.trim();


    if (!name) {

        showToast(
            "Nhập tên danh mục"
        );

        return;

    }


    await dbInsert(
        "categories",
        {
            name
        }
    );


    input.value = "";


    AppState.categories =
        await dbGet(
            "categories"
        );


    renderRestaurant();

    showToast(
        "Đã thêm danh mục"
    );

}


/* ADD DISH */

async function addDish() {

    const categoryId =
        document.getElementById(
            "dishCategorySelect"
        ).value;


    const input =
        document.getElementById(
            "newDishName"
        );


    const name =
        input.value.trim();


    if (!categoryId) {

        showToast(
            "Chọn danh mục"
        );

        return;

    }


    if (!name) {

        showToast(
            "Nhập tên món"
        );

        return;

    }


    await dbInsert(
        "dishes",
        {
            category_id:
                categoryId,

            name
        }
    );


    input.value = "";


    AppState.dishes =
        await dbGet(
            "dishes"
        );


    renderRestaurant();

    showToast(
        "Đã thêm món"
    );

}


/* DELETE CATEGORY */

async function deleteCategory(id) {

    const hasDish =
        AppState.dishes.some(
            dish =>
                String(
                    dish.category_id
                ) === String(id)
        );


    if (hasDish) {

        showToast(
            "Danh mục còn món, không thể xóa"
        );

        return;

    }


    if (
        !confirm(
            "Xóa danh mục này?"
        )
    ) return;


    await dbDelete(
        "categories",
        id
    );


    AppState.categories =
        AppState.categories.filter(
            category =>
                String(category.id) !==
                String(id)
        );


    renderRestaurant();

    showToast(
        "Đã xóa danh mục"
    );

}


/* DELETE DISH */

async function deleteDish(id) {

    if (
        !confirm(
            "Xóa món này?"
        )
    ) return;


    await dbDelete(
        "dishes",
        id
    );


    AppState.dishes =
        AppState.dishes.filter(
            dish =>
                String(dish.id) !==
                String(id)
        );


    renderRestaurant();

    showToast(
        "Đã xóa món"
    );

}
