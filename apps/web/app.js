const dependencyGroups = [
  {
    id: "characters",
    title: "Characters",
    accent: ["#2f6f73", "#d58f5f"],
    choices: [
      {
        id: "maya",
        name: "Maya",
        type: "hero",
        note: "Ceramic artist, rain-worn but warm, expressive hands, indigo-stained apron.",
        tags: ["identity", "wardrobe", "face"],
        selected: true,
      },
      {
        id: "arjun",
        name: "Arjun",
        type: "voice",
        note: "Brother present through voice note, soft humor, family-memory anchor.",
        tags: ["voiceover", "memory"],
        selected: false,
      },
    ],
  },
  {
    id: "scenes",
    title: "Scenes",
    accent: ["#1d3044", "#3978f2"],
    choices: [
      {
        id: "rainy-studio",
        name: "Rainy studio arrival",
        type: "scene 01",
        note: "Wet windows, flickering lamp, brass tools, train fatigue turning into focus.",
        tags: ["location", "lighting"],
        selected: true,
      },
      {
        id: "clay-table",
        name: "Blue bowl shaping",
        type: "scene 02",
        note: "Close hand work, thunder cue, tactile clay texture, recipe memory.",
        tags: ["macro", "action"],
        selected: false,
      },
    ],
  },
  {
    id: "visuals",
    title: "Visual Language",
    accent: ["#be6244", "#f0c05a"],
    choices: [
      {
        id: "indigo-clay",
        name: "Indigo clay palette",
        type: "palette",
        note: "Deep blue vessels, rain gloss, brass highlights, warm lamp contrast.",
        tags: ["color", "brand-safe"],
        selected: true,
      },
      {
        id: "notebook",
        name: "Recipe notebook texture",
        type: "prop",
        note: "Aged paper, handwritten margins, family continuity reference.",
        tags: ["prop", "texture"],
        selected: false,
      },
    ],
  },
  {
    id: "motion",
    title: "Motion, Audio, Transitions",
    accent: ["#7657d9", "#2f8f6b"],
    choices: [
      {
        id: "rain-thunder",
        name: "Rain to thunder bridge",
        type: "audio",
        note: "Sound bridge from train ambience into studio thunder and wheel hum.",
        tags: ["sfx", "transition"],
        selected: true,
      },
      {
        id: "point-animation",
        name: "Point animation reveal",
        type: "share",
        note: "Share-board hover points reveal scene notes, palette, and motion choices.",
        tags: ["share-link", "animation"],
        selected: false,
      },
    ],
  },
];

function getElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required UI element: ${selector}`);
  }
  return element;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const canvas = getElement("#dependencyCanvas");
const scriptFile = getElement("#scriptFile");
const scriptInput = getElement("#scriptInput");
const selectedCount = getElement("#selectedCount");
const readyScore = getElement("#readyScore");
const selectionList = getElement("#selectionList");
const previewState = getElement("#previewState");
const moodboardCopy = getElement("#moodboardCopy");
const shareLink = getElement("#shareLink");
const agentNote = getElement("#agentNote");

function renderCanvas() {
  canvas.innerHTML = dependencyGroups
    .map(
      (group) => `
      <section class="dependency-group" aria-labelledby="${escapeHtml(group.id)}-title">
        <div class="group-header">
          <h3 id="${escapeHtml(group.id)}-title">${escapeHtml(group.title)}</h3>
          <span>${group.choices.length} options</span>
        </div>
        <div class="choice-stack">
          ${group.choices
            .map(
              (choice) => `
              <article class="choice-card ${choice.selected ? "is-selected" : ""}" data-choice-id="${escapeHtml(choice.id)}">
                <div class="choice-thumb" style="--thumb-a: ${escapeHtml(group.accent[0])}; --thumb-b: ${escapeHtml(group.accent[1])}"></div>
                <div class="choice-content">
                  <div class="choice-meta">
                    <span class="pill">${escapeHtml(choice.type)}</span>
                    ${choice.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
                  </div>
                  <h3>${escapeHtml(choice.name)}</h3>
                  <p>${escapeHtml(choice.note)}</p>
                  <div class="choice-controls">
                    <input value="${escapeHtml(choice.name)}" aria-label="Name tag for ${escapeHtml(choice.name)}" data-name-input="${escapeHtml(choice.id)}" />
                    <button class="select-toggle" type="button" data-select="${escapeHtml(choice.id)}">
                      ${choice.selected ? "Selected" : "Pick"}
                    </button>
                  </div>
                </div>
              </article>
            `,
            )
            .join("")}
        </div>
      </section>
    `,
    )
    .join("");

  updateSummary();
}

function updateSummary() {
  const selected = dependencyGroups.flatMap((group) =>
    group.choices
      .filter((choice) => choice.selected)
      .map((choice) => ({ ...choice, group: group.title })),
  );
  selectedCount.textContent = String(selected.length);
  const score = Math.min(100, 24 + selected.length * 16);
  readyScore.textContent = `${score}%`;
  previewState.textContent = score >= 88 ? "Ready" : "Draft";
  moodboardCopy.textContent =
    score >= 88
      ? "Moodboard package ready: hero character, scene base, visual grammar, audio bridge, and share animation are locked for generation."
      : "Pick the main character and scene references to unlock a generated board with palette, props, transitions, and approval notes.";

  if (selected.length === 0) {
    selectionList.innerHTML = `<div class="empty-state">Pick dependencies from the canvas to build the moodboard brief.</div>`;
    return;
  }

  selectionList.innerHTML = selected
    .map(
      (choice) => `
      <div class="selection-row">
        <strong>${escapeHtml(choice.name)}</strong>
        <span>${escapeHtml(choice.group)}</span>
      </div>
    `,
    )
    .join("");
}

function getSelectedChoices() {
  return dependencyGroups.flatMap((group) =>
    group.choices
      .filter((choice) => choice.selected)
      .map((choice) => ({ ...choice, group: group.title })),
  );
}

function updateAgentNote() {
  const text = scriptInput.value;
  const characters = new Set(text.match(/\b[A-Z]{3,}\b/g) ?? []);
  const sceneBeats = Math.max(1, text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length);
  const visualTerms = [
    "rain",
    "studio",
    "clay",
    "lamp",
    "brass",
    "window",
    "notebook",
    "bowl",
  ].filter((term) => text.toLowerCase().includes(term)).length;
  const motionTerms = ["voice", "thunder", "train", "flicker", "shape"].filter((term) =>
    text.toLowerCase().includes(term),
  ).length;

  agentNote.innerHTML = `<strong>Agent read:</strong> ${characters.size || 1} characters, ${sceneBeats} scene beats, ${visualTerms || 1} visual dependencies, ${motionTerms || 1} motion/audio cues.`;
}

function findChoice(choiceId) {
  for (const group of dependencyGroups) {
    const choice = group.choices.find((item) => item.id === choiceId);
    if (choice) {
      return choice;
    }
  }
  return null;
}

canvas.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select]");
  if (!button) return;
  const choice = findChoice(button.dataset.select);
  if (!choice) return;
  choice.selected = !choice.selected;
  shareLink.textContent = "";
  renderCanvas();
});

canvas.addEventListener("input", (event) => {
  const input = event.target.closest("[data-name-input]");
  if (!input) return;
  const choice = findChoice(input.dataset.nameInput);
  if (!choice) return;
  choice.name = input.value;
  updateSummary();
});

scriptFile.addEventListener("change", () => {
  const file = scriptFile.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    scriptInput.value = String(reader.result ?? "");
    updateAgentNote();
    shareLink.textContent = `Loaded ${file.name}.`;
  });
  reader.readAsText(file);
});

scriptInput.addEventListener("input", () => {
  updateAgentNote();
});

getElement("#parseButton").addEventListener("click", () => {
  dependencyGroups.forEach((group) => {
    group.choices.forEach((choice, index) => {
      choice.selected = index === 0;
    });
  });
  updateAgentNote();
  shareLink.textContent = "Canvas refreshed from the current script.";
  renderCanvas();
});

getElement("#resetButton").addEventListener("click", () => {
  dependencyGroups.forEach((group) => {
    group.choices.forEach((choice) => {
      choice.selected = false;
    });
  });
  shareLink.textContent = "";
  renderCanvas();
});

getElement("#submitButton").addEventListener("click", () => {
  dependencyGroups.forEach((group) => {
    const hasSelection = group.choices.some((choice) => choice.selected);
    if (!hasSelection) group.choices[0].selected = true;
  });
  shareLink.textContent = "Moodboard generation queued with selected dependencies.";
  renderCanvas();
});

function createShareLink() {
  const slug =
    getSelectedChoices()
      .slice(0, 4)
      .map((choice) => choice.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
      .join("-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "script-board";
  shareLink.textContent = `https://cae.local/share/${slug}`;
}

getElement("#downloadButton").addEventListener("click", () => {
  const payload = {
    project: "Creative Automation Engine",
    source: "script-to-creative-canvas",
    selected_dependencies: getSelectedChoices(),
    generated_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "creative-moodboard-manifest.json";
  link.click();
  URL.revokeObjectURL(url);
  shareLink.textContent = "Downloaded creative-moodboard-manifest.json.";
});

getElement("#shareButton").addEventListener("click", createShareLink);
getElement("#shareTopButton").addEventListener("click", createShareLink);

updateAgentNote();
renderCanvas();
