// =========================
// SUPABASE INIT
// =========================
const SUPABASE_URL ='https://dbfycihbcosuxxkrmbhl.supabase.co';

const SUPABASE_KEY ='sb_publishable_aOyXtAbzrrX0Z9jPAU1qEA_0ZnK35BX';

const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);


// =====================================================
// EXISTING USER ID
// =====================================================

let savedUserId =
    localStorage.getItem("crdg_user_id");

if (!savedUserId) {

    savedUserId =
        crypto.randomUUID();

    localStorage.setItem(
        "crdg_user_id",
        savedUserId
    );
}




// =====================================================
// SHOW CREATE TABLE
// =====================================================

function showCreateTable() {

    document
        .getElementById("mainOptions")
        .style.display = "none";

    document
        .getElementById("joinSection")
        .classList.remove("active");

    document
        .getElementById("createSection")
        .classList.add("active");

    document
        .getElementById("message")
        .innerText = "";
}


// =====================================================
// SHOW JOIN TABLE
// =====================================================

function showJoinTable() {

    document
        .getElementById("mainOptions")
        .style.display = "none";

    document
        .getElementById("createSection")
        .classList.remove("active");

    document
        .getElementById("joinSection")
        .classList.add("active");

    document
        .getElementById("message")
        .innerText = "";
}


// =====================================================
// BACK TO MAIN OPTIONS
// =====================================================

function showMainOptions() {

    document
        .getElementById("createSection")
        .classList.remove("active");

    document
        .getElementById("joinSection")
        .classList.remove("active");

    document
        .getElementById("mainOptions")
        .style.display = "block";

    document
        .getElementById("message")
        .innerText = "";
}

// =====================================================
// MESSAGE
// =====================================================

function showMessage(text, isError = false) {

    const element =
        document.getElementById("message");

    element.innerText = text;

    element.style.color =
        isError ? "#ff6b6b" : "#00ff9d";
}


// =====================================================
// CREATE NEW TABLE
// =====================================================

async function createTable() {

    const playerName =
        document
            .getElementById("hostName")
            .value
            .trim();

    const phone =
        document
            .getElementById("hostPhone")
            .value
            .trim();

    const poolType =
        Number(
            document.querySelector(
                'input[name="poolType"]:checked'
            ).value
        );


    // ---------------------------------------------
    // Validation
    // ---------------------------------------------

    if (!playerName) {

        showMessage(
            "Please enter your name",
            true
        );

        return;
    }


    if (!/^[0-9]{10}$/.test(phone)) {

        showMessage(
            "Please enter a valid 10 digit phone number",
            true
        );

        return;
    }


    showMessage(
        "Creating table..."
    );


    try {

        // -----------------------------------------
        // CREATE TABLE
        // -----------------------------------------

        const { data, error } =
            await supabaseClient.rpc(
                "crdg_create_friend_table",
                {
                    p_user_id: savedUserId,
                    p_player_name: playerName,
                    p_phone: phone,
                    p_pool_type: poolType
                }
            );


        if (error) {

            console.error(
                "Create table error:",
                error
            );

            showMessage(
                "Unable to create table",
                true
            );

            return;
        }


        const result =
            data?.[0];


        if (!result) {

            showMessage(
                "Unable to create table",
                true
            );

            return;
        }


        if (result.status !== "success") {

            showMessage(
                result.message ||
                "Unable to create table",
                true
            );

            return;
        }


        const tableId =
            Number(result.table_id);


        // -----------------------------------------
        // Save table information
        // -----------------------------------------

        localStorage.setItem(
            "crdg_table",
            tableId
        );


        localStorage.setItem(
            "crdg_nickname",
            playerName
        );


        localStorage.setItem(
            "crdg_host",
            "true"
        );


        // -----------------------------------------
        // Now join the newly-created table
        // using the EXISTING join RPC
        // -----------------------------------------

        const { data: joinData, error: joinError } =
            await supabaseClient.rpc(
                "crdg_join_table",
                {
                    p_table_id: tableId,
                    p_password: "5E2D",
                    p_user_id: savedUserId,
                    p_display_name: playerName
                }
            );


        if (joinError) {

            console.error(
                "Host join error:",
                joinError
            );

            showMessage(
                "Table created, but host could not join",
                true
            );

            return;
        }


        const joinResult =
            joinData?.[0];


        if (
            !joinResult ||
            (
                joinResult.status !== "success" &&
                joinResult.status !== "reconnected"
            )
        ) {

            showMessage(
                joinResult?.message ||
                "Host could not join table",
                true
            );

            return;
        }


        // -----------------------------------------
        // Mark this player as HOST
        // -----------------------------------------

        const { error: hostError } =
            await supabaseClient
                .from("crdg_table_players")
                .update({
                    is_host: true
                })
                .eq("table_id", tableId)
                .eq("user_id", savedUserId);


        if (hostError) {

            console.error(
                "Host update error:",
                hostError
            );

            showMessage(
                "Host setup failed",
                true
            );

            return;
        }


        // -----------------------------------------
        // Save identity information
        // -----------------------------------------

        localStorage.setItem(
            "crdg_user_id",
            joinResult.user_id
        );

        localStorage.setItem(
            "crdg_table",
            tableId
        );

        localStorage.setItem(
            "crdg_nickname",
            playerName
        );


        // -----------------------------------------
        // Go to waiting room
        // -----------------------------------------

        window.location.href =
            "friends.html";

    } catch (error) {

        console.error(
            "Create table exception:",
            error
        );

        showMessage(
            "Unexpected error occurred",
            true
        );
    }
}


// =====================================================
// JOIN FRIEND'S TABLE
// =====================================================

async function joinFriendTable() {

    const tableId =
        Number(
            document
                .getElementById("joinTableId")
                .value
        );

    const playerName =
        document
            .getElementById("joinPlayerName")
            .value
            .trim();


    // ---------------------------------------------
    // Validation
    // ---------------------------------------------

    if (
        !tableId ||
        tableId < 100000 ||
        tableId > 999999
    ) {

        showMessage(
            "Please enter a valid 6 digit Table ID",
            true
        );

        return;
    }


    if (!playerName) {

        showMessage(
            "Please enter your name",
            true
        );

        return;
    }


    showMessage(
        "Joining table..."
    );


    try {

        // -----------------------------------------
        // Verify table exists and is waiting
        // -----------------------------------------

        const { data: table, error: tableError } =
            await supabaseClient
                .from("crdg_game_tables")
                .select(
                    "table_id,status"
                )
                .eq(
                    "table_id",
                    tableId
                )
                .maybeSingle();


        if (tableError) {

            console.error(
                tableError
            );

            showMessage(
                "Unable to check table",
                true
            );

            return;
        }


        if (!table) {

            showMessage(
                "Table not found",
                true
            );

            return;
        }


        if (table.status !== "waiting") {

            showMessage(
                "Game already started. New players are not allowed.",
                true
            );

            return;
        }


        // -----------------------------------------
        // Use existing join RPC
        // -----------------------------------------

        const { data, error } =
            await supabaseClient.rpc(
                "crdg_join_table",
                {
                    p_table_id: tableId,
                    p_password: "5E2D",
                    p_user_id: savedUserId,
                    p_display_name: playerName
                }
            );


        if (error) {

            console.error(
                "Join error:",
                error
            );

            showMessage(
                "Unable to join table",
                true
            );

            return;
        }


        const joinResult =
            data?.[0];


        if (!joinResult) {

            showMessage(
                "Unable to join table",
                true
            );

            return;
        }


        if (
            joinResult.status !== "success" &&
            joinResult.status !== "reconnected"
        ) {

            showMessage(
                joinResult.message ||
                "Unable to join table",
                true
            );

            return;
        }


        // -----------------------------------------
        // Save existing identity information
        // -----------------------------------------

        localStorage.setItem(
            "crdg_user_id",
            joinResult.user_id
        );

        localStorage.setItem(
            "crdg_table",
            tableId
        );

        localStorage.setItem(
            "crdg_nickname",
            playerName
        );

        localStorage.setItem(
            "crdg_host",
            "false"
        );


        // -----------------------------------------
        // Go to waiting room
        // -----------------------------------------

        window.location.href =
            "friends.html";

    } catch (error) {

        console.error(
            "Join exception:",
            error
        );

        showMessage(
            "Unexpected error occurred",
            true
        );
    }
}