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


// =========================
// SINGLE GLOBAL STATE (FIXED)
// =========================
let state = {
  sessionId: null,
  tableId: null,
  userId: null,
  nickname: null,
  seatNo: null,
  joined: false,
  hand: [],
  groups : [
    [],
    [],
    [],
    []
   ],
  selectedCard: null,
  jokerCard:null,
  lobbyTimerHandle: null,
  turnStartedAt:null,
  lastTurnSeat: null,
  dragCard: null,
  currentTurnSeat: null,
  declarationMode : false,
  declarationTimerStarted: false,
  declarationTimerInterval : null,
  myScore: null
};


let savedUserId =
  localStorage.getItem("crdg_user_id");

if(!savedUserId){

  savedUserId = crypto.randomUUID();

  localStorage.setItem(
    "crdg_user_id",
    savedUserId
  );
}

let gameStarting = false;
let gameEntered = false;

let turnTimerHandle = null;

document.getElementById( "openVisual").onclick = () => {
  draw("open");
};

document.getElementById( "stockCard").onclick = () => {
 draw("stock");
};

// =========================
// RENDER HAND
// =========================
function renderHand() {

    for(let g = 0; g < 4; g++) {

        const groupEl =
            document.getElementById("group" + g);

        groupEl.innerHTML =
            `<div class="group-title">
                Group ${g + 1}
             </div>`;

        if(!state.groups[g]) {
            state.groups[g] = [];
        }

        groupEl.ondragover = (e) => {
           e.preventDefault();
        };

        groupEl.ondrop = (e) => {

    e.preventDefault();

    if(!state.dragCard){
        return;
    }

    const sourceGroup =
        state.dragCard.group;

    const sourceIndex =
        state.dragCard.index;

    const cardToMove =
        state.dragCard.card;

    if(sourceGroup === g){
        return;
    }

    state.groups[sourceGroup]
        .splice(sourceIndex, 1);

    state.groups[g]
        .push(cardToMove);

    state.dragCard = null;

  renderHand();
  calculateDealScore();
};


        state.groups[g].forEach((card, index) => {

            const div =
                document.createElement("div");

            div.className =  "card card-enter";

            div.draggable = true;

            div.ondragstart = () => {

                  state.dragCard = {
                      card: card,
                      group: g,
                      index: index
                  };

              };

                if (isJokerCard(card)) {

                div.innerText =
                    card + " ⭐";

                div.classList.add(
                    "joker-highlight"
                );

            } else {

                div.innerText = card;
            }

            if (
                  card.includes("♥") ||
                  card.includes("♦")
              ){
                  div.classList.add("red-card");
              }

            // Highlight selected card

            if(
                state.selectedCard &&
                state.selectedCard.card === card &&
                state.selectedCard.group === g
            ){
                div.classList.add("selected");
            }

            // Select card

            div.onclick = () => {

                state.selectedCard = {
                    card: card,
                    group: g,
                    index: index
                };

                renderHand();
                calculateDealScore();
            };

            groupEl.appendChild(div);

            setTimeout(() => {

                div.classList.remove("card-enter");
                div.classList.add("card-show");

            }, 30 * index);

        });

    }
}

// =========================
// DRAW
// =========================
async function draw(source) {

  if (!state.sessionId) return;
  if(state.declarationMode){

    return;
}

  const { data, error } = await supabaseClient.rpc("crdg_draw_card", {
    p_session_id: state.sessionId,
    p_table_id: state.tableId,
    p_user_id: state.userId,
    p_source: source
  });

  if (error) {
    console.error(error);
    return;
  }

  const card = data?.[0]?.card;

  if (card) {

    state.groups[3].push(card);

    await loadSessionInfo();
    renderHand();
    calculateDealScore();

    updateActionButtons();
}
}

// =========================
// DISCARD
// =========================
async function discard() {

    if (!state.sessionId) return;
    if(state.declarationMode){

    return;
}

    const totalCards =
        state.groups.reduce(
            (a, g) => a + g.length,
            0
        );

    if (totalCards < 14) {

        alert("Pick a card first");
        return;
    }

    if (!state.selectedCard) {

        alert("Select a card to discard");
        return;
    }

    const cardToRemove =
        state.selectedCard;

    const { data, error } =
        await supabaseClient.rpc(
            "crdg_discard_card",
            {
                p_session_id: state.sessionId,
                p_table_id: state.tableId,
                p_user_id: state.userId,
                p_card: cardToRemove.card
            }
        );

    if (error) {

        console.error(error);
        return;
    }

    if (
        data &&
        data.length &&
        data[0].status === "success"
    ) {

        state.groups[
            cardToRemove.group
        ].splice(
            cardToRemove.index,
            1
        );

        state.selectedCard = null;

        renderHand();
        calculateDealScore();

        await loadSessionInfo();
    }
}

// =========================
// REALTIME
function subscribeRealtime() {

  if (!state.sessionId) return;

  supabaseClient
    .channel(
      "game-session-" +
      state.sessionId
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "crdg_game_sessions"
      },
      async () => {

        
        await loadSessionInfo();

        updateActionButtons();

      }
    )
    .subscribe((status) => {

    

});
}

async function loadSessionInfo() {

  const { data, error } =
    await supabaseClient
      .from("crdg_game_sessions")
      .select("*")
      .eq("session_id", state.sessionId)
      .single();

  if (error) {
    console.error(error);
    return;
  }

  state.dealerSeat = data.dealer_seat;
  state.currentTurnSeat = data.current_turn_seat;

  

  state.turnStartedAt =    new Date(
        data.turn_started_at
    ).getTime();

  document.getElementById("turnSeat").innerText =
    data.current_turn_seat || "-";

  document.getElementById("openVisual").innerText =
    data.open_pile?.slice(-1)[0] || "-";

    const openEl =
    document.getElementById("openVisual");

      openEl.classList.remove("red-card");

      if(
          data.open_pile?.[0]?.includes("♥") ||
          data.open_pile?.[0]?.includes("♦")
      ){
          openEl.classList.add("red-card");
      }

document.getElementById("jokerVisual").innerText =
    data.joker_card || "-";

  const jokerEl =
    document.getElementById("jokerVisual");

      jokerEl.classList.remove("red-card");

      if(
          data.joker_card?.includes("♥") ||
          data.joker_card?.includes("♦")
      ){
          jokerEl.classList.add("red-card");
      }

    state.jokerCard = data.joker_card;
    state.declarationMode =
    data.declaration_started || false;


          if(
          state.declarationMode &&
          !state.declarationTimerStarted
      ){

          clearInterval(
              state.turnTimerInterval
          );

          state.declarationTimerStarted =
              true;

          startDeclarationTimer();

      }


document.getElementById("stockCard").innerText =
    data.stock_pile?.length || 0;
    
    if(  state.lastTurnSeat !==  data.current_turn_seat)
    {
       state.lastTurnSeat =   data.current_turn_seat;
        startTurnTimer();
    }


   updateActionButtons();
}


function startDeclarationTimer(){

    const endTime =
        Date.now() + 60000;

    state.declarationTimerInterval =
        setInterval(() => {

        const seconds =
            Math.max(
                0,
                Math.floor(
                    (endTime - Date.now())
                    / 1000
                )
            );

        document.getElementById(
          "declarationTimer"
      ).innerText =
          "Declared..Arrange Cards (" +
          seconds +
          "s)";

        if(seconds <= 0){

            clearInterval(
                state.declarationTimerInterval
            );

            document.getElementById(
                "declarationTimer"
            ).innerText =
                "Submitting...";

            onDeclarationTimerExpired();

        }

    }, 1000);
}

function onDeclarationTimerExpired(){

    alert(
        "Auto Submit Soon"
    );

}


function getTotalCards(){

    let total = 0;

    for(let g = 0; g < 4; g++){

        if(state.groups[g]){

            total +=
                state.groups[g].length;
        }
    }

    return total;
}

function updateActionButtons(){

    const myTurn =
        state.seatNo ===
        state.currentTurnSeat;

    const cardCount =
        getTotalCards();

    const canDraw =
        myTurn &&
        cardCount === 13;

    const canDiscard =
        myTurn &&
        cardCount === 14;


    document.getElementById(
        "btnDiscard"
    ).disabled =
        !canDiscard;

    document.getElementById(
        "btnDeclare"
    ).disabled =
        !canDiscard;



  const openPile =
    document.getElementById(
        "openVisual"
    );

const stockPile =
    document.getElementById(
        "stockCard"
    );

if(canDraw){

    openPile.style.opacity = "1";
    stockPile.style.opacity = "1";

    openPile.style.pointerEvents =
        "auto";

    stockPile.style.pointerEvents =
        "auto";

}else{

    openPile.style.opacity = "0.4";
    stockPile.style.opacity = "0.4";

    openPile.style.pointerEvents =
        "none";

    stockPile.style.pointerEvents =
        "none";
}

if(state.declarationMode){
    btnDiscard.disabled = true;
    btnDeclare.disabled = true;

    return;
}

}


function isJokerCard(card) {

    if (card === "JOKER") {
        return true;
    }

    if (!state.jokerCard) {
        return false;
    }

    const jokerRank =
        state.jokerCard.replace(
            /[♠♥♦♣]/g,
            ""
        );

    const cardRank =
        card.replace(
            /[♠♥♦♣]/g,
            ""
        );

    return jokerRank === cardRank;
}


// =========================
// LOAD STATE

async function loadGame() {

  const { data, error } = await supabaseClient.rpc(
    "crdg_get_game_state",
    {
      p_session_id: state.sessionId,
      p_user_id: state.userId
    }
  );

  if (error) return console.error(error);

  if (!data) return;

  state.hand = data.hand || [];


  state.groups = [
    state.hand.slice(0,4),
    state.hand.slice(4,8),
    state.hand.slice(8,12),
    state.hand.slice(12)
  ];

  document.getElementById("turnSeat").innerText =
    data.session.current_turn_seat || "-";

 document.getElementById("openVisual").innerText =
    data.open_pile?.slice(-1)[0] || "-";

document.getElementById("jokerVisual").innerText =
    data.joker_card || "-";

document.getElementById("stockCard").innerText =
    data.stock_pile?.length || 0;
  
}

// =========================
// JOIN TABLE (FIXED)
// =========================
async function joinTable() {

  const tableId = document.getElementById("tableIdInput").value;
  const password = document.getElementById("password").value;
  const nickname = document.getElementById("nickname").value;

  // ✅ THIS IS WHERE IT GOES
  const userId = savedUserId;

  const { data, error } = await supabaseClient.rpc('crdg_join_table', {
    p_table_id: parseInt(tableId),
    p_password: '5E2D',
    p_user_id: userId,
    p_display_name: nickname
  });

  if (error || data?.[0]?.status === "fail") {
    alert("❌ Invalid table or password");
    return;
  }

  // save state
  state.userId = userId;
  state.tableId = parseInt(tableId);
  state.nickname = nickname;
  state.seatNo = data[0].seat_no;
  state.joined = true;

  localStorage.setItem("crdg_table", tableId);

  // UI switch → LOBBY
  document.getElementById("joinScreen").classList.add("hidden");
  document.getElementById("lobbyScreen").classList.remove("hidden");

  document.getElementById("lobbyTableId").innerText = tableId;
  document.getElementById("lobbySeat").innerText = state.seatNo;

  alert('Joined Successfully');
  // start lobby polling

  await postJoinFlow();
  loadLobbyState();
  state.lobbyTimerHandle = setInterval(loadLobbyState, 1000);
}

function startTurnTimer() {

    clearInterval(state.turnTimerInterval);

    state.turnTimerInterval =
        setInterval(() => {

            const elapsed =
                Math.floor(
                    (Date.now() -
                     state.turnStartedAt) / 1000
                );

            const remaining = Math.max(0, 40 - elapsed);

            document.getElementById(
                "turnTimer"
            ).innerText = remaining;

        }, 1000);
}

async function loadPlayers() {

  const { data, error } =
    await supabaseClient.rpc(
      "crdg_get_lobby_players",
      {
        p_table_id: state.tableId
      }
    );

  if (error) {
    console.error(error);
    return;
  }

  if (!data) return;

  
  // Clear opponent boxes
  for (let i = 1; i <= 5; i++) {

    document.getElementById(
      "opp" + i
    ).innerHTML = `
      <div>Empty</div>
    `;
  }

  // Render opponents clockwise
  data.forEach(player => {

    // Skip myself
    if (player.seat_no === state.seatNo) {
      return;
    }

    let relative =
      player.seat_no - state.seatNo;

    if (relative < 0) {
      relative += 6;
    }

    let target = null;

    switch (relative) {

      case 1:
        target = "opp4";   // immediate left
        break;

      case 2:
        target = "opp2";
        break;

      case 3:
        target = "opp1";   // top center
        break;

      case 4:
        target = "opp3";
        break;

      case 5:
        target = "opp5";   // immediate right
        break;
    }

    if (!target) return;

    let icons = "";

if(player.seat_no === state.dealerSeat){
  icons += " 🎲";
}

if(player.seat_no === state.currentTurnSeat){
  icons += " 🔥";
}

    document.getElementById(target).innerHTML = `
      <div><b>${player.display_name}${icons}</b></div>
      <div style="font-size:24px;">🂠🂠🂠🂠🂠</div>
      <div>Score : 0</div>
    `;
  });


  let myIcons = "";

if(state.seatNo === state.dealerSeat){
    myIcons += " 🎲";
}

if(state.seatNo === state.currentTurnSeat){
    myIcons += " 🔥";
}

document.getElementById("myInfo").innerHTML =
    `You ${myIcons}`;

document.getElementById("myScore").innerHTML =
    `Score : ${state.myScore || 0}`;
}




async function loadLobbyState() {

  const { data, error } =
    await supabaseClient.rpc(
      "crdg_get_table_state",
      {
        p_table_id: state.tableId
      }
    );

  if(error){
    console.error(error);
    return;
  }

  if(!data || !data.length){
    return;
  }

  const s = data[0];

  document.getElementById("lobbyPlayers").innerText =    s.player_count;

 // document.getElementById("lobbyTimer").innerText =    s.seconds_remaining;

  const now = new Date().getTime();
  const start = new Date(s.lobby_started_at).getTime();

  const diff = Math.floor((now - start) / 1000);
  const remaining = 60 - diff;

document.getElementById("lobbyTimer").innerText =  remaining > 0 ? remaining : 0;


const { data: players } =
await supabaseClient.rpc(
  "crdg_get_lobby_players",
  {
    p_table_id: state.tableId
  }
);

for(let i = 1; i <= 6; i++) {

  document.getElementById(
    "seat" + i
  ).innerText =
    `Seat ${i} : Empty`;

}


players.forEach(p => {

  document.getElementById(
    "seat" + p.seat_no
  ).innerText =
    `Seat ${p.seat_no} : ${p.display_name}`;

});



  if (
  !gameStarting &&
  state.seatNo === 1 &&
  s.player_count >= 2 &&
  s.seconds_remaining <= 0 &&
  s.status === "waiting"
){
    gameStarting = true;
    await startGame();
}

  if(s.status === "running"){

    const { data: sessions } =
    await supabaseClient
      .from("crdg_game_sessions")
      .select("session_id")
      .eq("table_id", state.tableId)
      .order("session_id", { ascending: false })
      .limit(1);

    if(sessions && sessions.length){

        state.sessionId =
          sessions[0].session_id;

        await enterGame();
    }
}
}



async function enterGame(){

  if (gameEntered) return;
   gameEntered = true;

  clearInterval(state.lobbyTimerHandle);

  document
    .getElementById("lobbyScreen")
    .classList.add("hidden");

  document
    .getElementById("app")
    .classList.remove("hidden");

  document
    .getElementById("tableIdDisplay")
    .innerText = state.tableId;

    await loadGame();
    await loadSessionInfo();
    await loadPlayers();
    renderHand();
    calculateDealScore();

    subscribeRealtime();

}



async function startGame(){

  const { data, error } =
    await supabaseClient.rpc(
      "crdg_start_game",
      {
        p_table_id: state.tableId
      }
    );

  if(error){
    console.error(error);
    return;
  }

  if(data && data.length){

      state.sessionId =
        data[0].session_id;

      await enterGame();
  }
}




async function declareGame() {

  if(state.declarationMode){

    return;
}

    const totalCards =
        state.groups.reduce(
            (a, g) => a + g.length,
            0
        );

    if(totalCards !== 14){

        alert(
            "You must have 14 cards to declare"
        );

        return;
    }

    if(!state.selectedCard){

        alert(
            "Select one card before declaration"
        );

        return;
    }

    if(!confirm( "Confirm Declaration?" )){
        return;
    }

    const declareCard =
        state.selectedCard.card;

    // Create copy of groups

      const groupsForDeclaration =
          JSON.parse(
              JSON.stringify(state.groups)
          );

      // Remove selected card

      groupsForDeclaration[
          state.selectedCard.group
      ].splice(
          state.selectedCard.index,
          1
      );

          
        const { data, error } =
        await supabaseClient.rpc(
            "crdg_calculate_running_score",
            {
                p_groups: groupsForDeclaration,
                p_joker_card: state.jokerCard
            }
        );

    if(error){

        console.error(error);

        return;
    }

    const declarationScore = Number(data || 0);
    const declarationStatus =  data?.[0]?.status;

    //const declarationScore =  0;

    if(declarationScore === 0){

          alert(
              "VALID DECLARATION"
          );


              const declareCard =
                state.selectedCard.card;

            const { data, error } =
                await supabaseClient.rpc(
                    "crdg_submit_declaration",
                    {
                        p_session_id: state.sessionId,
                        p_table_id: state.tableId,
                        p_user_id: state.userId,
                        p_declare_card: declareCard,
                        p_groups: groupsForDeclaration,
                        p_joker_card: state.jokerCard
                    }
                );

            if(error){

                console.error(error);

                return;
            }

            console.log(data);








      }
      else{

          alert(
              "INVALID DECLARATION : "
              + declarationScore
          );

      }


}



async function calculateDealScore() {


    const { data, error } =
        await supabaseClient.rpc(
            "crdg_calculate_running_score",
            {
                p_groups: state.groups,
                p_joker_card: state.jokerCard
            }
        );

    if (error) {

        console.error(error);

        return;
    }

    document.getElementById(
        "dealScore"
    ).innerText =
        "Deal Score : " + data;
}

function getCardValue(card) {

    if (!card) return 0;

    if (card === "JOKER") {
        return 0;
    }

    let rank =
        card.replace(/[♠♥♦♣]/g, "");

    if (
        rank === "A" ||
        rank === "J" ||
        rank === "Q" ||
        rank === "K"
    ) {
        return 10;
    }

    return parseInt(rank) || 0;
}

window.onload = () => {

  const savedTable = localStorage.getItem("crdg_table");
  const savedUser = localStorage.getItem("crdg_user_id");

  // only restore minimal state, DO NOT ENTER GAME
  if (savedTable && savedUser) {
    state.tableId = parseInt(savedTable);
    state.userId = savedUser;
  }

  // ALWAYS show login screen first
  document.getElementById("joinScreen").classList.remove("hidden");
  document.getElementById("lobbyScreen").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
};

async function postJoinFlow() {

  const { data } = await supabaseClient.rpc(
    "crdg_get_table_state",
    {
      p_table_id: state.tableId
    }
  );

  const s = data?.[0];
  if (!s) return;

  // WAITING → LOBBY
  if (s.status === "waiting") {

    document.getElementById("joinScreen").classList.add("hidden");
    document.getElementById("lobbyScreen").classList.remove("hidden");

    loadLobbyState();
    state.lobbyTimerHandle = setInterval(loadLobbyState, 1000);
  }

  // STARTED → GAME
  if (s.status === "started") {
    await enterGame();
  }
}