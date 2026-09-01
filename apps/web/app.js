const baseIdeas = [
  {
    id: "idea-founder-proof",
    title: "Founder POV proof film",
    hook: "Open on the founder describing the exact problem, then cut into proof, product, and emotional payoff.",
    script:
      "A founder walks through the gap in the market with one honest line. We see the old workflow break, the new workflow click into place, and a final customer moment that makes the benefit feel obvious.",
    tone: "clear, premium, human",
    open: true,
    selected: true,
  },
  {
    id: "idea-world-before-after",
    title: "World before / world after",
    hook: "Use a sharp contrast between the messy old reality and the calmer new operating system.",
    script:
      "The film starts inside chaos: scattered notes, tabs, assets, and approvals. The same team then moves through one clean creative board where every decision becomes visible and reusable.",
    tone: "kinetic, satisfying, visual",
    open: false,
    selected: false,
  },
  {
    id: "idea-character-led",
    title: "Character-led mini story",
    hook: "Turn the audience pain point into one memorable protagonist and a small narrative arc.",
    script:
      "One creator is trying to turn raw context into a campaign before a deadline. Each decision creates a new visual branch until the final storyboard feels inevitable.",
    tone: "warm, cinematic, useful",
    open: false,
    selected: false,
  },
];

const canvasState = {
  connectors: ["GPT", "Gemini", "11 Labs"],
  ideas: [...baseIdeas],
  activeIdeaId: "idea-founder-proof",
  activeView: "content",
  characters: [
    {
      id: "creator",
      title: "Lead creator",
      detail: "Expressive operator, hands-on, owns the creative call.",
      selected: true,
    },
    {
      id: "client",
      title: "Client reviewer",
      detail: "Approves from a share link, reacts to visual clarity.",
      selected: false,
    },
    {
      id: "team",
      title: "Studio team",
      detail: "Moves between research, scripts, assets, and final boards.",
      selected: false,
    },
  ],
  scenes: [
    {
      id: "knowledge-dump",
      title: "Knowledge dump",
      detail: "Raw notes, links, references, and constraints entering Content.",
      selected: true,
    },
    {
      id: "idea-review",
      title: "Idea review",
      detail: "Script cards open, edit, compare, and move into Canvas.",
      selected: false,
    },
    {
      id: "moodboard-output",
      title: "Moodboard output",
      detail: "A polished visual board with storyboard references and motion notes.",
      selected: false,
    },
  ],
  chat: [
    {
      role: "assistant",
      text: "Send an idea from Content and I’ll fan it into character sheets, scene sheets, and a final moodboard.",
    },
  ],
};

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

const contentView = getElement("#contentView");
const canvasView = getElement("#canvasView");
const tabs = [...document.querySelectorAll("[data-view]")];
const canvasStatus = getElement("#canvasStatus");
const knowledgeInput = getElement("#knowledgeInput");
const researchFile = getElement("#researchFile");
const generateIdeasButton = getElement("#generateIdeasButton");
const clearKnowledgeButton = getElement("#clearKnowledgeButton");
const ideaList = getElement("#ideaList");
const ideaCount = getElement("#ideaCount");
const connectorInput = getElement("#connectorInput");
const connectorList = getElement("#connectorList");
const addConnectorButton = getElement("#addConnectorButton");
const topSendButton = getElement("#topSendButton");
const selectedIdeaTitle = getElement("#selectedIdeaTitle");
const selectedIdeaBody = getElement("#selectedIdeaBody");
const characterOptions = getElement("#characterOptions");
const sceneOptions = getElement("#sceneOptions");
const comboOptions = getElement("#comboOptions");
const moodboardFrame = getElement("#moodboardFrame");
const chatLog = getElement("#chatLog");
const chatInput = getElement("#chatInput");
const shareLink = getElement("#shareLink");

function getActiveIdea() {
  return (
    canvasState.ideas.find((idea) => idea.id === canvasState.activeIdeaId) ?? canvasState.ideas[0]
  );
}

function setView(view) {
  canvasState.activeView = view;
  contentView.classList.toggle("active", view === "content");
  canvasView.classList.toggle("active", view === "canvas");
  tabs.forEach((tab) => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  canvasStatus.textContent = view === "content" ? "Content active" : "Canvas active";
}

function renderConnectors() {
  connectorList.innerHTML = canvasState.connectors
    .map(
      (connector) => `
        <button class="connector-pill" type="button" data-remove-connector="${escapeHtml(connector)}">
          ${escapeHtml(connector)}
          <span>×</span>
        </button>
      `,
    )
    .join("");
}

function renderIdeas() {
  ideaCount.textContent = `${canvasState.ideas.length} ideas`;
  ideaList.innerHTML = canvasState.ideas
    .map(
      (idea) => `
        <article class="idea-card ${idea.selected ? "selected" : ""}" data-idea-id="${escapeHtml(idea.id)}">
          <div class="idea-card-top">
            <div>
              <p class="eyebrow">${escapeHtml(idea.tone)}</p>
              <h3>${escapeHtml(idea.title)}</h3>
            </div>
            <button class="icon-button" type="button" data-open-idea="${escapeHtml(idea.id)}">
              ${idea.open ? "−" : "+"}
            </button>
          </div>
          <p>${escapeHtml(idea.hook)}</p>
          ${
            idea.open
              ? `
                <textarea class="idea-editor" data-edit-idea="${escapeHtml(idea.id)}">${escapeHtml(idea.script)}</textarea>
                <div class="idea-actions">
                  <button class="air-button neutral" type="button" data-select-idea="${escapeHtml(idea.id)}">Select</button>
                  <button class="air-button primary" type="button" data-send-idea="${escapeHtml(idea.id)}">Send to Canvas</button>
                </div>
              `
              : ""
          }
        </article>
      `,
    )
    .join("");
}

function renderChat() {
  chatLog.innerHTML = canvasState.chat
    .map(
      (message) => `
        <div class="chat-bubble ${escapeHtml(message.role)}">
          ${escapeHtml(message.text)}
        </div>
      `,
    )
    .join("");
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderOptionGrid(target, options, type) {
  target.innerHTML = options
    .map(
      (option) => `
        <button class="sheet-option ${option.selected ? "selected" : ""}" type="button" data-sheet-type="${escapeHtml(type)}" data-sheet-id="${escapeHtml(option.id)}">
          <span class="sheet-thumb"></span>
          <strong>${escapeHtml(option.title)}</strong>
          <small>${escapeHtml(option.detail)}</small>
        </button>
      `,
    )
    .join("");
}

function renderCombos() {
  const pickedCharacters = canvasState.characters.filter((option) => option.selected);
  const pickedScenes = canvasState.scenes.filter((option) => option.selected);
  const combos = pickedCharacters.flatMap((character) =>
    pickedScenes.map((scene) => ({
      id: `${character.id}-${scene.id}`,
      title: `${character.title} × ${scene.title}`,
      detail: "Ready for storyboard moodboard treatment.",
    })),
  );

  comboOptions.innerHTML =
    combos.length > 0
      ? combos
          .map(
            (combo) => `
              <div class="combo-card">
                <strong>${escapeHtml(combo.title)}</strong>
                <span>${escapeHtml(combo.detail)}</span>
              </div>
            `,
          )
          .join("")
      : `<div class="empty-state">Select one character and one scene to create mixes.</div>`;
}

function renderCanvas() {
  const activeIdea = getActiveIdea();
  selectedIdeaTitle.textContent = activeIdea.title;
  selectedIdeaBody.textContent = activeIdea.script;
  renderOptionGrid(characterOptions, canvasState.characters, "characters");
  renderOptionGrid(sceneOptions, canvasState.scenes, "scenes");
  renderCombos();
}

function renderMoodboard() {
  const activeIdea = getActiveIdea();
  const selectedCharacters = canvasState.characters.filter((option) => option.selected).length;
  const selectedScenes = canvasState.scenes.filter((option) => option.selected).length;
  moodboardFrame.classList.add("generated");
  shareLink.textContent = `${activeIdea.title}: ${selectedCharacters} character direction${selectedCharacters === 1 ? "" : "s"}, ${selectedScenes} scene direction${selectedScenes === 1 ? "" : "s"}, visual board ready.`;
}

function renderAll() {
  renderConnectors();
  renderIdeas();
  renderCanvas();
  renderChat();
}

function selectIdea(ideaId) {
  canvasState.activeIdeaId = ideaId;
  canvasState.ideas = canvasState.ideas.map((idea) => ({
    ...idea,
    selected: idea.id === ideaId,
    open: idea.id === ideaId ? true : idea.open,
  }));
  shareLink.textContent = "";
  renderAll();
}

function sendIdeaToCanvas(ideaId) {
  selectIdea(ideaId);
  const activeIdea = getActiveIdea();
  canvasState.chat.push({
    role: "assistant",
    text: `Moved “${activeIdea.title}” into Canvas. I created starter character and scene sheets from the idea.`,
  });
  setView("canvas");
  renderAll();
}

function createIdeasFromKnowledge() {
  const source = knowledgeInput.value.trim();
  const compactSource = source.replace(/\s+/g, " ");
  const subject = compactSource.split(/[.?!]/)[0]?.slice(0, 96) || "the product story";
  const timestamp = Date.now();

  canvasState.ideas = [
    {
      id: `idea-proof-${timestamp}`,
      title: "Proof-first explainer",
      hook: `Turn “${subject}” into a direct problem → proof → transformation script.`,
      script: `Open with the sharpest audience pain from the knowledge dump. Show the old way for three seconds, introduce the new system, then land on one proof point and one emotional benefit.`,
      tone: "simple, confident",
      open: true,
      selected: true,
    },
    {
      id: `idea-documentary-${timestamp}`,
      title: "Mini documentary arc",
      hook: "Use the research as a world-building layer, then follow one person through the change.",
      script:
        "Start with context and tension. Cut to a protagonist navigating the problem. Use details from the research as visual proof, then close with the new workflow feeling calm and inevitable.",
      tone: "human, premium",
      open: false,
      selected: false,
    },
    {
      id: `idea-ugc-${timestamp}`,
      title: "Creator demo with fast hooks",
      hook: "Make the idea understandable in the first five seconds with a direct creator-led demo.",
      script:
        "A creator says the before-state out loud, shows the single action that changes everything, and moves through three quick proof beats before a clean CTA.",
      tone: "fast, social",
      open: false,
      selected: false,
    },
    {
      id: `idea-cinematic-${timestamp}`,
      title: "Cinematic mood piece",
      hook: "Let the visuals carry the emotional value while the script stays minimal.",
      script:
        "Use sparse copy, strong transitions, and repeating motifs from the knowledge dump. Build from raw materials to a finished board, ending on the clearest product promise.",
      tone: "visual, atmospheric",
      open: false,
      selected: false,
    },
  ];
  canvasState.activeIdeaId = canvasState.ideas[0].id;
  canvasState.chat.push({
    role: "assistant",
    text: "Generated four script directions from the Content knowledge dump. Pick one and send it to Canvas.",
  });
  renderAll();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

researchFile.addEventListener("change", () => {
  const file = researchFile.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    knowledgeInput.value = String(reader.result ?? "");
    createIdeasFromKnowledge();
  });
  reader.readAsText(file);
});

generateIdeasButton.addEventListener("click", createIdeasFromKnowledge);

clearKnowledgeButton.addEventListener("click", () => {
  knowledgeInput.value = "";
  canvasState.ideas = [...baseIdeas];
  canvasState.activeIdeaId = "idea-founder-proof";
  renderAll();
});

ideaList.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-idea]");
  const selectButton = event.target.closest("[data-select-idea]");
  const sendButton = event.target.closest("[data-send-idea]");

  if (openButton) {
    const idea = canvasState.ideas.find((item) => item.id === openButton.dataset.openIdea);
    if (idea) {
      idea.open = !idea.open;
      renderIdeas();
    }
    return;
  }

  if (selectButton) {
    selectIdea(selectButton.dataset.selectIdea);
    return;
  }

  if (sendButton) {
    sendIdeaToCanvas(sendButton.dataset.sendIdea);
  }
});

ideaList.addEventListener("input", (event) => {
  const editor = event.target.closest("[data-edit-idea]");
  if (!editor) return;
  const idea = canvasState.ideas.find((item) => item.id === editor.dataset.editIdea);
  if (!idea) return;
  idea.script = editor.value;
  if (idea.id === canvasState.activeIdeaId) {
    renderCanvas();
  }
});

addConnectorButton.addEventListener("click", () => {
  const connector = connectorInput.value.trim();
  if (!connector) return;
  if (!canvasState.connectors.some((item) => item.toLowerCase() === connector.toLowerCase())) {
    canvasState.connectors.push(connector);
  }
  connectorInput.value = "";
  renderConnectors();
});

connectorInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addConnectorButton.click();
  }
});

connectorList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-connector]");
  if (!button) return;
  canvasState.connectors = canvasState.connectors.filter(
    (connector) => connector !== button.dataset.removeConnector,
  );
  renderConnectors();
});

topSendButton.addEventListener("click", () => sendIdeaToCanvas(canvasState.activeIdeaId));

document.querySelector(".figma-board").addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-sheet-type]");
  if (!optionButton) return;
  const collection = canvasState[optionButton.dataset.sheetType];
  const option = collection.find((item) => item.id === optionButton.dataset.sheetId);
  if (!option) return;
  option.selected = !option.selected;
  shareLink.textContent = "";
  renderCanvas();
});

getElement("#generateMoodboardButton").addEventListener("click", renderMoodboard);

getElement("#downloadBoardButton").addEventListener("click", () => {
  const payload = {
    idea: getActiveIdea(),
    connectors: canvasState.connectors,
    characters: canvasState.characters.filter((option) => option.selected),
    scenes: canvasState.scenes.filter((option) => option.selected),
    generated_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "creative-canvas-moodboard.json";
  link.click();
  URL.revokeObjectURL(url);
  shareLink.textContent = "Downloaded creative-canvas-moodboard.json.";
});

getElement("#shareBoardButton").addEventListener("click", () => {
  const slug = getActiveIdea()
    .title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  shareLink.textContent = `https://cae.local/canvas/${slug}`;
});

getElement("#sendChatButton").addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  canvasState.chat.push({ role: "user", text });
  canvasState.chat.push({
    role: "assistant",
    text: "Added that as a canvas direction. Next build can route this into real model calls for more sheets.",
  });
  chatInput.value = "";
  renderChat();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    getElement("#sendChatButton").click();
  }
});

renderAll();
