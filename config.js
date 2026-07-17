(function () {
  "use strict";

  const categoryRows = document.querySelector("#categoryRows");
  const addCategoryButton = document.querySelector("#addCategoryButton");
  const downloadCategoriesButton = document.querySelector("#downloadCategoriesButton");
  const questionFileSelect = document.querySelector("#questionFileSelect");
  const questionsEditor = document.querySelector("#questionsEditor");
  const downloadQuestionsButton = document.querySelector("#downloadQuestionsButton");
  const reloadButton = document.querySelector("#reloadButton");

  const state = {
    categories: [],
    questionFiles: new Map()
  };

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
    const response = await fetch(path, { cache: "no-store" });
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
        state.questionFiles.set(file, `# New question file: ${file}\n`);
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

  loadAll().catch((error) => {
    categoryRows.innerHTML = `<p class="note">${error.message}</p>`;
  });
})();
