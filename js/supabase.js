/* =========================================================
   SUPABASE
   BẾP NHÀ DUYÊN
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
    "https://fwamplkwgsxotcykqxhd.supabase.co";


const SUPABASE_ANON_KEY =
    "sb_publishable_l7M95el4HZhbXCj4rzq9pg_-1MoyZoQ";


const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


/* =========================================================
   HELPER
========================================================= */


/*
 * Kiểm tra ID có phải bigint hợp lệ hay không.
 *
 * Ví dụ:
 *
 * 12          -> true
 * "12"        -> true
 * 849dda53... -> false
 * ""          -> false
 * null        -> false
 */

function isValidBigIntId(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return false;

    }


    return /^-?\d+$/.test(
        String(value).trim()
    );

}


/*
 * Chuyển ID về number.
 *
 * Database đang dùng bigint.
 */

function toBigIntNumber(value) {

    if (
        !isValidBigIntId(value)
    ) {

        return null;

    }


    return Number(
        String(value).trim()
    );

}


/*
 * Chuẩn hóa text để tìm tên.
 */

function normalizeText(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   RESOLVE CATEGORY ID
========================================================= */

/*
 * Nếu category_id đã là bigint:
 *
 *     giữ nguyên
 *
 * Nếu category_id là UUID:
 *
 *     tìm category bằng category_name
 *
 * Nếu không tìm được:
 *
 *     trả về null
 */

async function resolveCategoryId(
    categoryId,
    categoryName
) {

    /*
     * ID hợp lệ
     */

    if (
        isValidBigIntId(
            categoryId
        )
    ) {

        return toBigIntNumber(
            categoryId
        );

    }


    /*
     * Không có tên danh mục
     */

    if (
        !categoryName
    ) {

        return null;

    }


    /*
     * Tìm danh mục theo tên
     */

    const name =
        String(
            categoryName
        ).trim();


    if (!name) {

        return null;

    }


    const {
        data,
        error
    } =
        await db
            .from("categories")
            .select(
                "id,name,type"
            )
            .eq(
                "name",
                name
            )
            .limit(1);


    if (error) {

        console.error(
            "RESOLVE CATEGORY ERROR:",
            error
        );

        return null;

    }


    if (
        Array.isArray(data) &&
        data.length > 0
    ) {

        return toBigIntNumber(
            data[0].id
        );

    }


    /*
     * Nếu không khớp tuyệt đối,
     * thử tìm toàn bộ rồi so sánh
     * không phân biệt hoa thường.
     */

    const {
        data: allCategories,
        error: allError
    } =
        await db
            .from("categories")
            .select(
                "id,name,type"
            );


    if (allError) {

        console.error(
            "RESOLVE CATEGORY ALL ERROR:",
            allError
        );

        return null;

    }


    const normalized =
        normalizeText(
            name
        );


    const found =
        (
            allCategories || []
        ).find(
            category =>
                normalizeText(
                    category.name
                ) === normalized
        );


    if (found) {

        return toBigIntNumber(
            found.id
        );

    }


    return null;

}


/* =========================================================
   RESOLVE DISH ID
========================================================= */

/*
 * Nếu dish_id là bigint:
 *
 *     giữ nguyên
 *
 * Nếu dish_id là UUID:
 *
 *     tìm món bằng dish_name
 *
 * Nếu không tìm được:
 *
 *     trả về null
 */

async function resolveDishId(
    dishId,
    dishName,
    categoryId
) {

    /*
     * ID hợp lệ
     */

    if (
        isValidBigIntId(
            dishId
        )
    ) {

        return toBigIntNumber(
            dishId
        );

    }


    /*
     * Không có tên món
     */

    if (
        !dishName
    ) {

        return null;

    }


    const name =
        String(
            dishName
        ).trim();


    if (!name) {

        return null;

    }


    /*
     * Tìm theo tên món.
     *
     * Nếu có category_id thì
     * tìm luôn theo category.
     */

    let query =
        db
            .from("dishes")
            .select(
                "id,name,category_id"
            )
            .eq(
                "name",
                name
            );


    if (
        isValidBigIntId(
            categoryId
        )
    ) {

        query =
            query.eq(
                "category_id",
                toBigIntNumber(
                    categoryId
                )
            );

    }


    const {
        data,
        error
    } =
        await query
            .limit(1);


    if (error) {

        console.error(
            "RESOLVE DISH ERROR:",
            error
        );

        return null;

    }


    if (
        Array.isArray(data) &&
        data.length > 0
    ) {

        return toBigIntNumber(
            data[0].id
        );

    }


    /*
     * Không tìm thấy thì lấy
     * toàn bộ món để so sánh
     * không phân biệt hoa thường.
     */

    const {
        data: allDishes,
        error: allError
    } =
        await db
            .from("dishes")
            .select(
                "id,name,category_id"
            );


    if (allError) {

        console.error(
            "RESOLVE DISH ALL ERROR:",
            allError
        );

        return null;

    }


    const normalized =
        normalizeText(
            name
        );


    let found =
        (
            allDishes || []
        ).find(
            dish =>
                normalizeText(
                    dish.name
                ) === normalized
        );


    /*
     * Nếu có category thì
     * ưu tiên đúng category.
     */

    if (
        found &&
        isValidBigIntId(
            categoryId
        )
    ) {

        const sameCategory =
            (
                allDishes || []
            ).find(
                dish =>
                    normalizeText(
                        dish.name
                    ) === normalized &&
                    String(
                        dish.category_id
                    ) ===
                    String(
                        categoryId
                    )
            );


        if (sameCategory) {

            found =
                sameCategory;

        }

    }


    if (found) {

        return toBigIntNumber(
            found.id
        );

    }


    return null;

}


/* =========================================================
   NORMALIZE TRANSACTION PAYLOAD
========================================================= */

/*
 * Đây là phần QUAN TRỌNG NHẤT.
 *
 * Database:
 *
 * transactions.category_id -> bigint
 * transactions.dish_id     -> bigint
 *
 * Nhưng code cũ có thể gửi UUID.
 *
 * Hàm này sửa lại trước khi INSERT.
 */

async function normalizeTransactionPayload(
    payload
) {

    const original =
        payload || {};


    const fixed = {
        ...original
    };


    /*
     * =========================
     * CATEGORY
     * =========================
     */

    let categoryId =
        fixed.category_id;


    /*
     * Nếu category_id không phải
     * bigint thì tìm bằng category_name.
     */

    if (
        !isValidBigIntId(
            categoryId
        )
    ) {

        categoryId =
            await resolveCategoryId(
                categoryId,
                fixed.category_name
            );

    } else {

        categoryId =
            toBigIntNumber(
                categoryId
            );

    }


    /*
     * =========================
     * DISH
     * =========================
     */

    let dishId =
        fixed.dish_id;


    /*
     * Nếu dish_id không phải
     * bigint thì tìm bằng dish_name.
     */

    if (
        !isValidBigIntId(
            dishId
        )
    ) {

        dishId =
            await resolveDishId(
                dishId,
                fixed.dish_name,
                categoryId
            );

    } else {

        dishId =
            toBigIntNumber(
                dishId
            );

    }


    /*
     * Gán lại ID chuẩn.
     *
     * Không bao giờ gửi UUID
     * xuống transactions nữa.
     */

    fixed.category_id =
        categoryId;


    fixed.dish_id =
        dishId;


    /*
     * Log để kiểm tra.
     */

    console.log(
        "TRANSACTION PAYLOAD GỐC:",
        original
    );


    console.log(
        "TRANSACTION PAYLOAD SAU KHI SỬA:",
        fixed
    );


    return fixed;

}


/* =========================================================
   GET
========================================================= */

async function dbGet(
    table,
    options = {}
) {

    try {

        let query =
            db
                .from(table)
                .select(
                    options.select || "*"
                );


        /*
         * FILTER
         */

        if (options.eq) {

            for (
                const [
                    key,
                    value
                ]
                of Object.entries(
                    options.eq
                )
            ) {

                if (
                    value === null ||
                    value === undefined
                ) {

                    query =
                        query.is(
                            key,
                            null
                        );

                } else {

                    query =
                        query.eq(
                            key,
                            value
                        );

                }

            }

        }


        /*
         * ORDER
         */

        if (options.order) {

            query =
                query.order(
                    options.order.column,
                    {
                        ascending:
                            options.order.ascending ??
                            false
                    }
                );

        }


        const {
            data,
            error
        } =
            await query;


        if (error) {

            console.error(
                `DB GET ERROR [${table}]`,
                {
                    code:
                        error.code,

                    message:
                        error.message,

                    details:
                        error.details,

                    hint:
                        error.hint
                }
            );


            showToast(
                `Lỗi ${table}: ${error.message}`
            );


            throw error;

        }


        console.log(
            `DB GET OK [${table}]`,
            data
        );


        return data || [];

    }
    catch (error) {

        console.error(
            `DB GET EXCEPTION [${table}]`,
            error
        );

        throw error;

    }

}


/* =========================================================
   INSERT
========================================================= */

async function dbInsert(
    table,
    payload
) {

    try {

        /*
         * =========================
         * TRANSACTIONS
         * =========================
         *
         * Tự động sửa UUID -> bigint
         */

        if (
            table === "transactions"
        ) {

            payload =
                await normalizeTransactionPayload(
                    payload
                );

        }


        console.log(
            `DB INSERT [${table}]`,
            payload
        );


        const {
            data,
            error
        } =
            await db
                .from(table)
                .insert(
                    payload
                )
                .select();


        if (error) {

            console.error(
                `DB INSERT ERROR [${table}]`,
                {
                    code:
                        error.code,

                    message:
                        error.message,

                    details:
                        error.details,

                    hint:
                        error.hint,

                    payload
                }
            );


            showToast(
                `Lỗi ${table}: ${error.message}`
            );


            throw error;

        }


        console.log(
            `DB INSERT OK [${table}]`,
            data
        );


        return data || [];

    }
    catch (error) {

        console.error(
            `DB INSERT EXCEPTION [${table}]`,
            error
        );

        throw error;

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function dbUpdate(
    table,
    id,
    payload
) {

    try {

        /*
         * TRANSACTIONS UPDATE
         *
         * Cũng phải sửa UUID -> bigint
         */

        if (
            table === "transactions"
        ) {

            payload =
                await normalizeTransactionPayload(
                    payload
                );

        }


        const {
            data,
            error
        } =
            await db
                .from(table)
                .update(
                    payload
                )
                .eq(
                    "id",
                    id
                )
                .select();


        if (error) {

            console.error(
                `DB UPDATE ERROR [${table}]`,
                {
                    code:
                        error.code,

                    message:
                        error.message,

                    details:
                        error.details,

                    hint:
                        error.hint,

                    payload
                }
            );


            showToast(
                `Lỗi ${table}: ${error.message}`
            );


            throw error;

        }


        return data || [];

    }
    catch (error) {

        console.error(
            `DB UPDATE EXCEPTION [${table}]`,
            error
        );

        throw error;

    }

}


/* =========================================================
   DELETE
========================================================= */

async function dbDelete(
    table,
    id
) {

    try {

        /*
         * ID của database là bigint.
         */

        let fixedId =
            id;


        if (
            table === "categories" ||
            table === "dishes" ||
            table === "transactions"
        ) {

            if (
                isValidBigIntId(id)
            ) {

                fixedId =
                    toBigIntNumber(
                        id
                    );

            }

        }


        const {
            error
        } =
            await db
                .from(table)
                .delete()
                .eq(
                    "id",
                    fixedId
                );


        if (error) {

            console.error(
                `DB DELETE ERROR [${table}]`,
                {
                    code:
                        error.code,

                    message:
                        error.message,

                    details:
                        error.details,

                    hint:
                        error.hint,

                    id:
                        fixedId
                }
            );


            showToast(
                `Lỗi ${table}: ${error.message}`
            );


            throw error;

        }


        return true;

    }
    catch (error) {

        console.error(
            `DB DELETE EXCEPTION [${table}]`,
            error
        );

        throw error;

    }

}


/* =========================================================
   TEST DATABASE
========================================================= */

async function testDatabase() {

    try {

        const categories =
            await dbGet(
                "categories"
            );


        const dishes =
            await dbGet(
                "dishes"
            );


        console.log(
            "=============================="
        );


        console.log(
            "DATABASE TEST"
        );


        console.log(
            "Categories:",
            categories
        );


        console.log(
            "Dishes:",
            dishes
        );


        console.log(
            "=============================="
        );


        return true;

    }
    catch (error) {

        console.error(
            "DATABASE TEST FAILED:",
            error
        );

        return false;

    }

}
