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

const currentUrl = new URL(globalThis.location.href);
const defaultApiBase =
  currentUrl.hostname === "localhost" || currentUrl.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : `${currentUrl.origin}/api`;
const apiBaseUrl =
  currentUrl.searchParams.get("api") ??
  globalThis.localStorage?.getItem("cae_api_base") ??
  defaultApiBase;

const canvasState = {
  assets: [
    {
      asset_id: "asset-brand-notes",
      kind: "reference",
      name: "Brand notes",
      source: "seed",
      tags: ["reference", "content"],
    },
  ],
  connectors: ["GPT", "Gemini", "11 Labs"],
  connectorCatalog: [],
  compareIds: ["idea-founder-proof"],
  ideas: [...baseIdeas],
  activeIdeaId: "idea-founder-proof",
  activeView: "content",
  links: [],
  projectId: "creative-engine-demo",
  zoom: 1,
  understanding: {
    audience: ["creative team", "brand owner"],
    constraints: ["Human approval before final generation"],
    creative_angles: ["before/after workflow reveal", "creator demo"],
    links: [],
    product_truths: ["Knowledge becomes script ideas", "Selected ideas become visual boards"],
    summary:
      "Add research, notes, scripts, links, or brand context to unlock sharper creative understanding.",
    themes: ["Creative clarity", "Workflow transformation"],
    tone: ["simple", "premium", "cinematic"],
  },
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

async function postJson(path, payload) {
  const response = await globalThis.fetch(`${apiBaseUrl}${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

async function checkApiHealth() {
  try {
    const response = await globalThis.fetch(`${apiBaseUrl}/v1/health`);
    apiStatus.textContent = response.ok ? "Backend: connected" : "Backend: local fallback";
    if (response.ok) {
      await hydrateConnectorCatalog();
    }
  } catch {
    apiStatus.textContent = "Backend: local fallback";
  }
}

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
const researchLinkInput = getElement("#researchLinkInput");
const addResearchLinkButton = getElement("#addResearchLinkButton");
const researchLinkList = getElement("#researchLinkList");
const understandButton = getElement("#understandButton");
const generateIdeasButton = getElement("#generateIdeasButton");
const clearKnowledgeButton = getElement("#clearKnowledgeButton");
const ideaList = getElement("#ideaList");
const ideaCount = getElement("#ideaCount");
const comparisonList = getElement("#comparisonList");
const researchInsights = getElement("#researchInsights");
const connectorInput = getElement("#connectorInput");
const connectorList = getElement("#connectorList");
const connectorCatalog = getElement("#connectorCatalog");
const addConnectorButton = getElement("#addConnectorButton");
const apiStatus = getElement("#apiStatus");
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
const flowCanvas = getElement(".flow-canvas");
const assetFile = getElement("#assetFile");
const assetGrid = getElement("#assetGrid");
const zoomLabel = getElement("#zoomLabel");
const projectStatus = getElement("#projectStatus");

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

  connectorCatalog.innerHTML = canvasState.connectorCatalog
    .filter((connector) => !canvasState.connectors.includes(connector.name))
    .slice(0, 5)
    .map(
      (connector) => `
        <button class="catalog-pill" type="button" data-add-catalog-connector="${escapeHtml(connector.name)}">
          ${escapeHtml(connector.name)}
          <span>${escapeHtml(connector.role)}</span>
        </button>
      `,
    )
    .join("");
}

function renderLinks() {
  researchLinkList.innerHTML =
    canvasState.links.length > 0
      ? canvasState.links
          .map(
            (link) => `
              <button class="link-chip" type="button" data-remove-link="${escapeHtml(link)}">
                ${escapeHtml(link)}
                <span>×</span>
              </button>
            `,
          )
          .join("")
      : `<span class="empty-inline">No research links yet.</span>`;
}

function renderResearchInsights() {
  const understanding = canvasState.understanding;
  const rows = [
    ["Summary", [understanding.summary]],
    ["Themes", understanding.themes],
    ["Audience", understanding.audience],
    ["Constraints", understanding.constraints],
    ["Product truths", understanding.product_truths],
    ["Creative angles", understanding.creative_angles],
    ["Tone", understanding.tone],
  ];

  researchInsights.innerHTML = rows
    .map(
      ([label, values]) => `
        <article class="insight-card">
          <strong>${escapeHtml(label)}</strong>
          <p>${values.map((value) => escapeHtml(value)).join(" · ")}</p>
        </article>
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
                  <button class="air-button neutral" type="button" data-compare-idea="${escapeHtml(idea.id)}">Compare</button>
                  <button class="air-button neutral" type="button" data-duplicate-idea="${escapeHtml(idea.id)}">Duplicate</button>
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

function renderComparison() {
  const ideas = canvasState.ideas.filter((idea) => canvasState.compareIds.includes(idea.id));
  comparisonList.innerHTML =
    ideas.length > 0
      ? ideas
          .map(
            (idea) => `
              <article class="comparison-card">
                <strong>${escapeHtml(idea.title)}</strong>
                <span>${escapeHtml(idea.tone)}</span>
                <p>${escapeHtml(idea.hook)}</p>
              </article>
            `,
          )
          .join("")
      : `<div class="empty-state">Add ideas to compare hooks, tone, and story shape.</div>`;
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

function renderAssets() {
  assetGrid.innerHTML =
    canvasState.assets.length > 0
      ? canvasState.assets
          .map(
            (asset) => `
              <article class="asset-card">
                <span class="asset-thumb ${escapeHtml(asset.kind)}"></span>
                <strong>${escapeHtml(asset.name)}</strong>
                <small>${escapeHtml(asset.tags.join(" · "))}</small>
              </article>
            `,
          )
          .join("")
      : `<div class="empty-state">Upload brand assets, reference images, audio, or scene material.</div>`;
}

function renderZoom() {
  flowCanvas.style.transform = `scale(${canvasState.zoom})`;
  flowCanvas.style.transformOrigin = "top left";
  zoomLabel.textContent = `${Math.round(canvasState.zoom * 100)}%`;
}

async function renderMoodboard() {
  const activeIdea = getActiveIdea();
  const selectedCharacters = canvasState.characters.filter((option) => option.selected).length;
  const selectedScenes = canvasState.scenes.filter((option) => option.selected).length;
  moodboardFrame.classList.add("generated");
  shareLink.textContent = "Generating moodboard payload…";

  try {
    const response = await postJson("/v1/moodboards", {
      characters: canvasState.characters,
      connectors: canvasState.connectors,
      idea: activeIdea,
      scenes: canvasState.scenes,
    });
    shareLink.textContent = `${response.share_url} — ${response.summary}`;
    apiStatus.textContent = "Backend: connected";
  } catch {
    shareLink.textContent = `${activeIdea.title}: ${selectedCharacters} character direction${selectedCharacters === 1 ? "" : "s"}, ${selectedScenes} scene direction${selectedScenes === 1 ? "" : "s"}, visual board ready.`;
    apiStatus.textContent = "Backend: local fallback";
  }
}

function renderAll() {
  renderConnectors();
  renderLinks();
  renderResearchInsights();
  renderIdeas();
  renderComparison();
  renderCanvas();
  renderAssets();
  renderZoom();
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

async function sendIdeaToCanvas(ideaId) {
  selectIdea(ideaId);
  const activeIdea = getActiveIdea();
  try {
    const expansion = await postJson("/v1/canvas/expand", { idea: activeIdea });
    canvasState.characters = expansion.characters;
    canvasState.scenes = expansion.scenes;
    apiStatus.textContent = "Backend: connected";
  } catch {
    apiStatus.textContent = "Backend: local fallback";
  }
  canvasState.chat.push({
    role: "assistant",
    text: `Moved “${activeIdea.title}” into Canvas. I created starter character and scene sheets from the idea.`,
  });
  setView("canvas");
  renderAll();
}

async function createIdeasFromKnowledge() {
  const source = knowledgeInput.value.trim();
  const compactSource = source.replace(/\s+/g, " ");
  const subject = compactSource.split(/[.?!]/)[0]?.slice(0, 96) || "the product story";
  const timestamp = Date.now();

  try {
    const response = await postJson("/v1/content/ideas", {
      connectors: canvasState.connectors,
      knowledge: source,
    });
    if (!Array.isArray(response.ideas) || response.ideas.length === 0) {
      throw new Error("No ideas returned");
    }
    canvasState.ideas = response.ideas.map((idea, index) => ({
      ...idea,
      open: index === 0,
      selected: index === 0,
    }));
    apiStatus.textContent = "Backend: connected";
  } catch {
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
    apiStatus.textContent = "Backend: local fallback";
  }
  canvasState.activeIdeaId = canvasState.ideas[0].id;
  canvasState.compareIds = [canvasState.ideas[0].id];
  canvasState.chat.push({
    role: "assistant",
    text: "Generated four script directions from the Content knowledge dump. Pick one and send it to Canvas.",
  });
  renderAll();
}

async function understandKnowledge() {
  try {
    const response = await postJson("/v1/content/understand", {
      knowledge: knowledgeInput.value,
      links: canvasState.links,
    });
    canvasState.understanding = response.understanding;
    apiStatus.textContent = "Backend: connected";
  } catch {
    const compact = knowledgeInput.value.replace(/\s+/g, " ").trim();
    canvasState.understanding = {
      ...canvasState.understanding,
      links: [...canvasState.links],
      summary:
        compact.length > 0
          ? `Local read: ${compact.slice(0, 180)}${compact.length > 180 ? "…" : ""}`
          : canvasState.understanding.summary,
    };
    apiStatus.textContent = "Backend: local fallback";
  }
  renderResearchInsights();
}

async function hydrateConnectorCatalog() {
  try {
    const response = await globalThis.fetch(`${apiBaseUrl}/v1/connectors`);
    if (!response.ok) return;
    const payload = await response.json();
    canvasState.connectorCatalog = payload.connectors ?? [];
    renderConnectors();
  } catch {
    canvasState.connectorCatalog = [];
  }
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
    void createIdeasFromKnowledge();
  });
  reader.readAsText(file);
});

addResearchLinkButton.addEventListener("click", () => {
  const link = researchLinkInput.value.trim();
  if (!link) return;
  if (!canvasState.links.includes(link)) {
    canvasState.links.push(link);
  }
  researchLinkInput.value = "";
  renderLinks();
});

researchLinkInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addResearchLinkButton.click();
  }
});

researchLinkList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-link]");
  if (!button) return;
  canvasState.links = canvasState.links.filter((link) => link !== button.dataset.removeLink);
  renderLinks();
});

understandButton.addEventListener("click", () => {
  void understandKnowledge();
});

generateIdeasButton.addEventListener("click", () => {
  void understandKnowledge();
  void createIdeasFromKnowledge();
});

clearKnowledgeButton.addEventListener("click", () => {
  knowledgeInput.value = "";
  canvasState.ideas = [...baseIdeas];
  canvasState.activeIdeaId = "idea-founder-proof";
  canvasState.compareIds = ["idea-founder-proof"];
  renderAll();
});

ideaList.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-idea]");
  const selectButton = event.target.closest("[data-select-idea]");
  const sendButton = event.target.closest("[data-send-idea]");
  const duplicateButton = event.target.closest("[data-duplicate-idea]");
  const compareButton = event.target.closest("[data-compare-idea]");

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

  if (compareButton) {
    const ideaId = compareButton.dataset.compareIdea;
    canvasState.compareIds = canvasState.compareIds.includes(ideaId)
      ? canvasState.compareIds.filter((id) => id !== ideaId)
      : [...canvasState.compareIds, ideaId];
    renderComparison();
    return;
  }

  if (duplicateButton) {
    const idea = canvasState.ideas.find(
      (item) => item.id === duplicateButton.dataset.duplicateIdea,
    );
    if (!idea) return;
    const copy = {
      ...idea,
      id: `${idea.id}-copy-${Date.now()}`,
      open: true,
      selected: false,
      title: `${idea.title} remix`,
    };
    canvasState.ideas = [copy, ...canvasState.ideas];
    renderIdeas();
    return;
  }

  if (sendButton) {
    void sendIdeaToCanvas(sendButton.dataset.sendIdea);
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

connectorCatalog.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-catalog-connector]");
  if (!button) return;
  const connector = button.dataset.addCatalogConnector;
  if (!canvasState.connectors.includes(connector)) {
    canvasState.connectors.push(connector);
  }
  renderConnectors();
});

topSendButton.addEventListener("click", () => {
  void sendIdeaToCanvas(canvasState.activeIdeaId);
});

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

function createSheet(type) {
  const collection = canvasState[type];
  const count = collection.length + 1;
  collection.push({
    detail:
      type === "characters"
        ? "New character direction added from the canvas."
        : "New scene direction added from the canvas.",
    id: `${type}-${Date.now()}`,
    selected: true,
    title: type === "characters" ? `Character option ${count}` : `Scene option ${count}`,
  });
  renderCanvas();
}

document.querySelectorAll("[data-add-sheet]").forEach((button) => {
  button.addEventListener("click", () => createSheet(button.dataset.addSheet));
});

getElement("#zoomInButton").addEventListener("click", () => {
  canvasState.zoom = Math.min(1.4, Number((canvasState.zoom + 0.1).toFixed(2)));
  renderZoom();
});

getElement("#zoomOutButton").addEventListener("click", () => {
  canvasState.zoom = Math.max(0.7, Number((canvasState.zoom - 0.1).toFixed(2)));
  renderZoom();
});

getElement("[data-add-note]").addEventListener("click", () => {
  const note = document.createElement("article");
  note.className = "canvas-node sticky-node";
  note.dataset.nodeId = `note-${Date.now()}`;
  note.style.left = "120px";
  note.style.top = "410px";
  note.innerHTML = `
    <p class="node-label">Note</p>
    <h3>Creative note</h3>
    <p>Drag me anywhere on the canvas.</p>
  `;
  flowCanvas.append(note);
});

function startNodeDrag(event) {
  const node = event.target.closest(".canvas-node");
  if (!node || event.target.closest("button, input, textarea")) return;

  const canvasRect = flowCanvas.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const offsetX = event.clientX - nodeRect.left;
  const offsetY = event.clientY - nodeRect.top;

  node.classList.add("dragging");
  node.style.right = "auto";
  node.style.bottom = "auto";
  node.style.left = `${nodeRect.left - canvasRect.left + flowCanvas.scrollLeft}px`;
  node.style.top = `${nodeRect.top - canvasRect.top + flowCanvas.scrollTop}px`;
  node.setPointerCapture(event.pointerId);

  function moveNode(moveEvent) {
    const nextLeft = moveEvent.clientX - canvasRect.left + flowCanvas.scrollLeft - offsetX;
    const nextTop = moveEvent.clientY - canvasRect.top + flowCanvas.scrollTop - offsetY;
    node.style.left = `${Math.max(12, nextLeft)}px`;
    node.style.top = `${Math.max(12, nextTop)}px`;
  }

  function stopDrag() {
    node.classList.remove("dragging");
    node.removeEventListener("pointermove", moveNode);
    node.removeEventListener("pointerup", stopDrag);
    node.removeEventListener("pointercancel", stopDrag);
  }

  node.addEventListener("pointermove", moveNode);
  node.addEventListener("pointerup", stopDrag);
  node.addEventListener("pointercancel", stopDrag);
}

flowCanvas.addEventListener("pointerdown", startNodeDrag);

getElement("#generateMoodboardButton").addEventListener("click", () => {
  void renderMoodboard();
});

assetFile.addEventListener("change", async () => {
  const files = [...(assetFile.files ?? [])];
  const createdAssets = await Promise.all(
    files.map(async (file) => {
      try {
        const payload = await postJson("/v1/assets", {
          kind: file.type.startsWith("audio/") ? "audio" : "reference",
          name: file.name,
          source: "upload",
          tags: ["asset", file.type || "file"],
        });
        apiStatus.textContent = "Backend: connected";
        return payload.asset;
      } catch {
        apiStatus.textContent = "Backend: local fallback";
        return {
          asset_id: `asset-${Date.now()}-${file.name}`,
          kind: file.type.startsWith("audio/") ? "audio" : "reference",
          name: file.name,
          source: "upload",
          tags: ["asset", file.type || "file"],
        };
      }
    }),
  );
  canvasState.assets = [...createdAssets, ...canvasState.assets];
  renderAssets();
});

getElement("#saveProjectButton").addEventListener("click", async () => {
  projectStatus.textContent = "Saving project…";
  try {
    const payload = await postJson("/v1/projects", {
      asset_count: canvasState.assets.length,
      canvas_node_count: document.querySelectorAll(".canvas-node").length,
      connector_count: canvasState.connectors.length,
      idea_count: canvasState.ideas.length,
      project_id: canvasState.projectId,
    });
    projectStatus.textContent = `Saved ${new Date(payload.project.saved_at).toLocaleTimeString()}`;
    apiStatus.textContent = "Backend: connected";
  } catch {
    projectStatus.textContent = `Saved locally ${new Date().toLocaleTimeString()}`;
    apiStatus.textContent = "Backend: local fallback";
  }
});

getElement("#exportPackageButton").addEventListener("click", async () => {
  projectStatus.textContent = "Preparing export…";
  try {
    const payload = await postJson("/v1/exports", {
      formats: ["json", "pdf", "png", "pptx", "figma"],
    });
    projectStatus.textContent = `Export ready: ${payload.export.formats.join(", ")}`;
    apiStatus.textContent = "Backend: connected";
  } catch {
    projectStatus.textContent = "Export ready locally: JSON, PDF, PNG, PPTX, Figma";
    apiStatus.textContent = "Backend: local fallback";
  }
});

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
void checkApiHealth();
