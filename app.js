(function () {
  "use strict";

  const colors = ["#f2b84b", "#d8363b", "#286fc7", "#2e9d68", "#8f57bd", "#ec7f3d"];
  const wheel = document.querySelector("#wheel");
  const spinButton = document.querySelector("#spinButton");
  const newGameButton = document.querySelector("#newGameButton");
  const resetScoresButton = document.querySelector("#resetScoresButton");
  const playerCountInput = document.querySelector("#playerCount");
  const playerNameFields = document.querySelector("#playerNameFields");
  const roundLimitInput = document.querySelector("#roundLimit");
  const languageSelect = document.querySelector("#languageSelect");
  const turnLabel = document.querySelector("#turnLabel");
  const roundLabel = document.querySelector("#roundLabel");
  const categoryLabel = document.querySelector("#categoryLabel");
  const questionText = document.querySelector("#questionText");
  const answerText = document.querySelector("#answerText");
  const scoreboard = document.querySelector("#scoreboard");
  const scoreButtons = Array.from(document.querySelectorAll("[data-points]"));
  const translations = {
    en: {
      navGame: "Game",
      navConfigure: "Configure",
      languageLabel: "Language",
      gameEyebrow: "German practice wheel",
      gameTitle: "Spin, answer, score, repeat.",
      start: "Start",
      players: "Players",
      playerCount: "Number of players",
      playerName: "Player",
      rounds: "Rounds",
      rounds10: "10 rounds",
      rounds20: "20 rounds",
      rounds30: "30 rounds",
      newGame: "New Game",
      resetScores: "Reset Scores",
      turn: "Turn",
      round: "Round",
      question: "Question",
      scoreAnswer: "Score this answer",
      spinToChoose: "Spin to choose",
      intro: "Add players, choose the round count, then press Start.",
      noPlayers: "No players yet.",
      suggestedAnswer: "Suggested answer",
      spinning: "Spinning...",
      getReady: "Get ready to answer in German.",
      gameOver: "Game over",
      wonWith: "won with",
      points: "points",
      nextTurn: "Next turn",
      pressStart: "press Start.",
      scoresReset: "Scores are reset. Press Start when ready.",
      dataError: "Data error"
    },
    de: {
      navGame: "Spiel",
      navConfigure: "Konfigurieren",
      languageLabel: "Sprache",
      gameEyebrow: "Deutsch-Übungsrad",
      gameTitle: "Drehen, antworten, punkten.",
      start: "Start",
      players: "Spieler",
      playerCount: "Anzahl der Spieler",
      playerName: "Spieler",
      rounds: "Runden",
      rounds10: "10 Runden",
      rounds20: "20 Runden",
      rounds30: "30 Runden",
      newGame: "Neues Spiel",
      resetScores: "Punkte zurücksetzen",
      turn: "Am Zug",
      round: "Runde",
      question: "Frage",
      scoreAnswer: "Antwort bewerten",
      spinToChoose: "Drehen zum Auswählen",
      intro: "Spieler eintragen, Rundenzahl wählen und Start drücken.",
      noPlayers: "Noch keine Spieler.",
      suggestedAnswer: "Mögliche Antwort",
      spinning: "Das Rad dreht...",
      getReady: "Mach dich bereit, auf Deutsch zu antworten.",
      gameOver: "Spiel beendet",
      wonWith: "gewinnt mit",
      points: "Punkten",
      nextTurn: "Nächster Zug",
      pressStart: "drücke Start.",
      scoresReset: "Punkte sind zurückgesetzt. Drücke Start, wenn du bereit bist.",
      dataError: "Datenfehler"
    }
  };

  const state = {
    categories: [],
    players: [],
    currentPlayerIndex: 0,
    currentRound: 0,
    roundLimit: 10,
    currentQuestion: null,
    rotation: 0,
    spinning: false,
    gameOver: false,
    language: localStorage.getItem("roata-language") || "en",
    messageKey: "intro"
  };

  function t(key) {
    return translations[state.language][key] || translations.en[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    languageSelect.value = state.language;
    updatePlayerNameLabels();
    refreshCurrentMessage();
  }

  function parseLines(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  }

  function parseCategoryLine(line) {
    const [id, label, file] = line.split("|").map((part) => part.trim());
    return id && label && file ? { id, label, file, questions: [] } : null;
  }

  function parseQuestionLine(line) {
    const [prompt, answer] = line.split("|").map((part) => part.trim());
    return prompt ? { prompt, answer: answer || "" } : null;
  }

  function readPlayerNames() {
    return Array.from(playerNameFields.querySelectorAll("input"))
      .map((input) => input.value.trim())
      .filter(Boolean);
  }

  function updatePlayerNameLabels() {
    playerNameFields.querySelectorAll("label").forEach((label, index) => {
      const text = `${t("playerName")} ${index + 1}`;
      label.querySelector("span").textContent = text;
      label.querySelector("input").placeholder = text;
    });
  }

  function renderPlayerNameFields() {
    const existingNames = readPlayerNames();
    const count = Number(playerCountInput.value);
    playerNameFields.innerHTML = "";

    for (let index = 0; index < count; index += 1) {
      const label = document.createElement("label");
      const name = existingNames[index] || `${t("playerName")} ${index + 1}`;
      label.innerHTML = `
        <span></span>
        <input type="text" spellcheck="false" value="">
      `;
      label.querySelector("input").value = name;
      playerNameFields.append(label);
    }

    updatePlayerNameLabels();
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.text();
  }

  async function loadGameData() {
    const categoryText = await fetchText("data/categories.txt");
    const categories = parseLines(categoryText).map(parseCategoryLine).filter(Boolean);
    const loaded = await Promise.all(
      categories.map(async (category) => {
        const questionTextFile = await fetchText(`data/${category.file}`);
        return {
          ...category,
          questions: parseLines(questionTextFile).map(parseQuestionLine).filter(Boolean)
        };
      })
    );
    state.categories = loaded.filter((category) => category.questions.length > 0);
    renderWheel();
  }

  function buildPlayers() {
    const names = readPlayerNames();
    state.players = names.map((name) => ({ name, score: 0 }));
    state.currentPlayerIndex = 0;
    state.currentRound = 0;
    state.roundLimit = Number(roundLimitInput.value);
    state.currentQuestion = null;
    state.gameOver = false;
    setMessage("spinToChoose", "intro", "");
    renderStatus();
    renderScoreboard();
  }

  function renderWheel() {
    const oldLabels = Array.from(wheel.querySelectorAll(".wheel-label"));
    oldLabels.forEach((label) => label.remove());

    if (!state.categories.length) {
      wheel.style.background = "conic-gradient(#f2b84b, #d8363b, #286fc7, #2e9d68, #f2b84b)";
      return;
    }

    const step = 360 / state.categories.length;
    const gradient = state.categories
      .map((category, index) => {
        const start = index * step;
        const end = (index + 1) * step;
        return `${colors[index % colors.length]} ${start}deg ${end}deg`;
      })
      .join(", ");

    wheel.style.background = `conic-gradient(${gradient})`;

    state.categories.forEach((category, index) => {
      const label = document.createElement("span");
      label.className = "wheel-label";
      label.textContent = category.label;
      const angle = index * step + step / 2;
      const labelAngle = (angle - 90) * (Math.PI / 180);
      const radius = 33;
      label.style.setProperty("--x", `${50 + Math.cos(labelAngle) * radius}%`);
      label.style.setProperty("--y", `${50 + Math.sin(labelAngle) * radius}%`);
      wheel.append(label);
    });
  }

  function renderStatus() {
    const player = state.players[state.currentPlayerIndex];
    turnLabel.textContent = player ? player.name : "-";
    roundLabel.textContent = `${state.currentRound} / ${state.roundLimit}`;
    spinButton.disabled = state.spinning || state.gameOver || !state.players.length || !state.categories.length;
    scoreButtons.forEach((button) => {
      button.disabled = !state.currentQuestion || state.spinning || state.gameOver;
    });
  }

  function renderScoreboard() {
    scoreboard.innerHTML = "";
    if (!state.players.length) {
      scoreboard.innerHTML = `<p class="note">${t("noPlayers")}</p>`;
      return;
    }

    state.players
      .map((player, index) => ({ ...player, index }))
      .sort((a, b) => b.score - a.score)
      .forEach((player) => {
        const row = document.createElement("div");
        row.className = `player-score${player.index === state.currentPlayerIndex ? " current" : ""}`;
        row.innerHTML = `<span></span><strong>${player.score}</strong>`;
        row.querySelector("span").textContent = player.name;
        scoreboard.append(row);
      });
  }

  function setQuestion(category, prompt, answer) {
    state.messageKey = "";
    categoryLabel.textContent = category;
    questionText.textContent = prompt;
    answerText.textContent = answer ? `${t("suggestedAnswer")}: ${answer}` : "";
  }

  function setMessage(categoryKey, promptKey, detail) {
    state.messageKey = promptKey;
    categoryLabel.textContent = t(categoryKey);
    questionText.textContent = detail ? `${detail} ${t(promptKey)}` : t(promptKey);
    answerText.textContent = "";
  }

  function refreshCurrentMessage() {
    if (state.currentQuestion) {
      const { category, question } = state.currentQuestion;
      setQuestion(category.label, question.prompt, question.answer);
    } else if (state.messageKey === "intro") {
      setMessage("spinToChoose", "intro", "");
    } else if (state.messageKey === "getReady") {
      setMessage("spinning", "getReady", "");
    } else if (state.messageKey === "scoresReset") {
      setMessage("spinToChoose", "scoresReset", "");
    } else if (state.messageKey === "pressStart") {
      const player = state.players[state.currentPlayerIndex];
      setMessage("nextTurn", "pressStart", player ? `${player.name},` : "");
    }
    renderScoreboard();
  }

  function spin() {
    if (state.spinning || state.gameOver || !state.players.length || !state.categories.length) {
      return;
    }

    state.spinning = true;
    state.currentQuestion = null;
    setMessage("spinning", "getReady", "");
    renderStatus();

    const categoryIndex = Math.floor(Math.random() * state.categories.length);
    const step = 360 / state.categories.length;
    const targetMiddle = categoryIndex * step + step / 2;
    const pointerAngle = 270;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    state.rotation += extraTurns * 360 + pointerAngle - targetMiddle;
    wheel.style.transform = `rotate(${state.rotation}deg)`;

    window.setTimeout(() => {
      const category = state.categories[categoryIndex];
      const question = category.questions[Math.floor(Math.random() * category.questions.length)];
      state.currentQuestion = { category, question };
      state.spinning = false;
      setQuestion(category.label, question.prompt, question.answer);
      renderStatus();
    }, 4900);
  }

  function score(points) {
    if (!state.currentQuestion || state.gameOver) {
      return;
    }

    const player = state.players[state.currentPlayerIndex];
    player.score += points;
    state.currentRound += 1;
    state.currentQuestion = null;

    if (state.currentRound >= state.roundLimit) {
      state.gameOver = true;
      const winnerScore = Math.max(...state.players.map((entry) => entry.score));
      const winners = state.players.filter((entry) => entry.score === winnerScore).map((entry) => entry.name).join(", ");
      state.messageKey = "";
      setQuestion(t("gameOver"), `${winners} ${t("wonWith")} ${winnerScore} ${t("points")}.`, "");
    } else {
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      setMessage("nextTurn", "pressStart", `${state.players[state.currentPlayerIndex].name},`);
    }

    renderStatus();
    renderScoreboard();
  }

  spinButton.addEventListener("click", spin);
  playerCountInput.addEventListener("change", () => {
    renderPlayerNameFields();
    buildPlayers();
  });
  newGameButton.addEventListener("click", buildPlayers);
  resetScoresButton.addEventListener("click", () => {
    state.players.forEach((player) => {
      player.score = 0;
    });
    state.currentRound = 0;
    state.currentPlayerIndex = 0;
    state.currentQuestion = null;
    state.gameOver = false;
    setMessage("spinToChoose", "scoresReset", "");
    renderStatus();
    renderScoreboard();
  });
  scoreButtons.forEach((button) => {
    button.addEventListener("click", () => score(Number(button.dataset.points)));
  });
  languageSelect.addEventListener("change", () => {
    state.language = languageSelect.value;
    localStorage.setItem("roata-language", state.language);
    applyTranslations();
  });

  renderPlayerNameFields();
  buildPlayers();
  applyTranslations();
  loadGameData()
    .then(renderStatus)
    .catch((error) => {
      setQuestion(t("dataError"), error.message, "");
      renderStatus();
    });
})();
