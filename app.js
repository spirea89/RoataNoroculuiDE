(function () {
  "use strict";

  const colors = ["#f2b84b", "#d8363b", "#286fc7", "#2e9d68", "#8f57bd", "#ec7f3d"];
  const wheel = document.querySelector("#wheel");
  const spinButton = document.querySelector("#spinButton");
  const newGameButton = document.querySelector("#newGameButton");
  const resetScoresButton = document.querySelector("#resetScoresButton");
  const playersInput = document.querySelector("#playersInput");
  const roundLimitInput = document.querySelector("#roundLimit");
  const turnLabel = document.querySelector("#turnLabel");
  const roundLabel = document.querySelector("#roundLabel");
  const categoryLabel = document.querySelector("#categoryLabel");
  const questionText = document.querySelector("#questionText");
  const answerText = document.querySelector("#answerText");
  const scoreboard = document.querySelector("#scoreboard");
  const scoreButtons = Array.from(document.querySelectorAll("[data-points]"));

  const state = {
    categories: [],
    players: [],
    currentPlayerIndex: 0,
    currentRound: 0,
    roundLimit: 10,
    currentQuestion: null,
    rotation: 0,
    spinning: false,
    gameOver: false
  };

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
    const names = parseLines(playersInput.value);
    state.players = names.map((name) => ({ name, score: 0 }));
    state.currentPlayerIndex = 0;
    state.currentRound = 0;
    state.roundLimit = Number(roundLimitInput.value);
    state.currentQuestion = null;
    state.gameOver = false;
    setQuestion("Spin to choose", "Add players, choose the round count, then press Start.", "");
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
      label.style.transform = `rotate(${angle}deg) translate(18%, -50%) rotate(${angle > 90 && angle < 270 ? 180 : 0}deg)`;
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
      scoreboard.innerHTML = "<p class=\"note\">No players yet.</p>";
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
    categoryLabel.textContent = category;
    questionText.textContent = prompt;
    answerText.textContent = answer ? `Suggested answer: ${answer}` : "";
  }

  function spin() {
    if (state.spinning || state.gameOver || !state.players.length || !state.categories.length) {
      return;
    }

    state.spinning = true;
    state.currentQuestion = null;
    setQuestion("Spinning...", "Get ready to answer in German.", "");
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
      setQuestion("Game over", `${winners} won with ${winnerScore} points.`, "");
    } else {
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      setQuestion("Next turn", `${state.players[state.currentPlayerIndex].name}, press Start.`, "");
    }

    renderStatus();
    renderScoreboard();
  }

  spinButton.addEventListener("click", spin);
  newGameButton.addEventListener("click", buildPlayers);
  resetScoresButton.addEventListener("click", () => {
    state.players.forEach((player) => {
      player.score = 0;
    });
    state.currentRound = 0;
    state.currentPlayerIndex = 0;
    state.currentQuestion = null;
    state.gameOver = false;
    setQuestion("Spin to choose", "Scores are reset. Press Start when ready.", "");
    renderStatus();
    renderScoreboard();
  });
  scoreButtons.forEach((button) => {
    button.addEventListener("click", () => score(Number(button.dataset.points)));
  });

  buildPlayers();
  loadGameData()
    .then(renderStatus)
    .catch((error) => {
      setQuestion("Data error", error.message, "");
      renderStatus();
    });
})();
