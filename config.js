(function () {
  "use strict";

  const categoryRows = document.querySelector("#categoryRows");
  const addCategoryButton = document.querySelector("#addCategoryButton");
  const downloadCategoriesButton = document.querySelector("#downloadCategoriesButton");
  const questionFileSelect = document.querySelector("#questionFileSelect");
  const questionsEditor = document.querySelector("#questionsEditor");
  const downloadQuestionsButton = document.querySelector("#downloadQuestionsButton");
  const reloadButton = document.querySelector("#reloadButton");
  const languageSelect = document.querySelector("#languageSelect");
  const translations = {
    en: {
      navGame: "Game",
      navConfigure: "Configure",
      languageLabel: "Language",
      configEyebrow: "Content editor",
      configTitle: "Configure categories and German questions.",
      categories: "Categories",
      addCategory: "Add Category",
      categoryId: "ID",
      wheelLabel: "Wheel label",
      questionFile: "Question file",
      downloadCategories: "Download categories.txt",
      questions: "Questions",
      questionsAndAnswers: "Questions and suggested answers",
      downloadQuestionFile: "Download question file",
      reloadTxt: "Reload from txt",
      staticNote: "Static GitHub Pages cannot save into the repository directly. Download the changed txt file, replace it in data/, commit, and GitHub Pages will serve it.",
      fileFormat: "Text file format",
      newQuestionFile: "New question file"
    },
    de: {
      navGame: "Spiel",
      navConfigure: "Konfigurieren",
      languageLabel: "Sprache",
      configEyebrow: "Inhalte bearbeiten",
      configTitle: "Kategorien und Deutschfragen konfigurieren.",
      categories: "Kategorien",
      addCategory: "Kategorie hinzufügen",
      categoryId: "ID",
      wheelLabel: "Rad-Beschriftung",
      questionFile: "Fragedatei",
      downloadCategories: "categories.txt herunterladen",
      questions: "Fragen",
      questionsAndAnswers: "Fragen und mögliche Antworten",
      downloadQuestionFile: "Fragedatei herunterladen",
      reloadTxt: "Aus txt neu laden",
      staticNote: "Statische GitHub Pages können nicht direkt ins Repository speichern. Lade die geänderte txt-Datei herunter, ersetze sie in data/, committe sie, und GitHub Pages stellt sie bereit.",
      fileFormat: "Textdatei-Format",
      newQuestionFile: "Neue Fragedatei"
    }
  };

  const state = {
    categories: [],
    questionFiles: new Map(),
    language: localStorage.getItem("roata-language") || "en"
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
  }

  function parseLines(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  }

  function parseCategoryLine(line) {
    const [id, label, file] = line.split("|").map((part) => part.trim());
    return id && label && file ? { id, label, file } : null;
  }

  async function fetchText(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.text();
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function categoriesToText() {
    return state.categories
      .map((category) => `${category.id.trim()}|${category.label.trim()}|${category.file.trim()}`)
      .filter((line) => !line.startsWith("||"))
      .join("\n") + "\n";
  }

  function syncRowsToState() {
    state.categories = Array.from(categoryRows.querySelectorAll(".field-row")).map((row) => ({
      id: row.querySelector("[data-field='id']").value,
      label: row.querySelector("[data-field='label']").value,
      file: row.querySelector("[data-field='file']").value
    }));
  }

  function renderQuestionFileOptions() {
    const current = questionFileSelect.value;
    questionFileSelect.innerHTML = "";
    state.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.file;
      option.textContent = `${category.label} (${category.file})`;
      questionFileSelect.append(option);
    });

    if (state.categories.some((category) => category.file === current)) {
      questionFileSelect.value = current;
    }
  }

  function renderRows() {
    categoryRows.innerHTML = "";
    state.categories.forEach((category) => {
      const row = document.createElement("div");
      row.className = "field-row";
      row.innerHTML = `
        <input data-field="id" aria-label="Category ID" value="">
        <input data-field="label" aria-label="Wheel label" value="">
        <input data-field="file" aria-label="Question file" value="">
        <button class="remove-row" type="button" aria-label="Remove category">x</button>
      `;
      row.querySelector("[data-field='id']").value = category.id;
      row.querySelector("[data-field='label']").value = category.label;
      row.querySelector("[data-field='file']").value = category.file;
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          syncRowsToState();
          renderQuestionFileOptions();
        });
      });
      row.querySelector(".remove-row").addEventListener("click", () => {
        row.remove();
        syncRowsToState();
        renderQuestionFileOptions();
        loadSelectedQuestionFile();
      });
      categoryRows.append(row);
    });
    renderQuestionFileOptions();
  }

  async function loadSelectedQuestionFile() {
    const file = questionFileSelect.value;
    if (!file) {
      questionsEditor.value = "";
      return;
    }

    if (!state.questionFiles.has(file)) {
      try {
        state.questionFiles.set(file, await fetchText(`data/${file}`));
      } catch (error) {
        state.questionFiles.set(file, `# ${t("newQuestionFile")}: ${file}\n`);
      }
    }
    questionsEditor.value = state.questionFiles.get(file);
  }

  async function loadAll() {
    const categoryText = await fetchText("data/categories.txt");
    state.categories = parseLines(categoryText).map(parseCategoryLine).filter(Boolean);
    state.questionFiles.clear();
    renderRows();
    await loadSelectedQuestionFile();
  }

  addCategoryButton.addEventListener("click", () => {
    syncRowsToState();
    state.categories.push({ id: "new_category", label: "New category", file: "new_category.txt" });
    renderRows();
  });

  downloadCategoriesButton.addEventListener("click", () => {
    syncRowsToState();
    downloadText("categories.txt", categoriesToText());
  });

  questionFileSelect.addEventListener("change", loadSelectedQuestionFile);
  questionsEditor.addEventListener("input", () => {
    if (questionFileSelect.value) {
      state.questionFiles.set(questionFileSelect.value, questionsEditor.value);
    }
  });
  downloadQuestionsButton.addEventListener("click", () => {
    const file = questionFileSelect.value || "questions.txt";
    downloadText(file, questionsEditor.value.endsWith("\n") ? questionsEditor.value : `${questionsEditor.value}\n`);
  });
  reloadButton.addEventListener("click", loadAll);
  languageSelect.addEventListener("change", () => {
    state.language = languageSelect.value;
    localStorage.setItem("roata-language", state.language);
    applyTranslations();
  });

  applyTranslations();
  loadAll().catch((error) => {
    categoryRows.innerHTML = `<p class="note">${error.message}</p>`;
  });
})();
