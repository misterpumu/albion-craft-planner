const storageKey = "albion-crafteo-inventory-v3";
const routeSettingsKey = "albion-crafteo-route-v1";
const ALL_CATEGORIES = "__ALL__";
const MATERIAL_NAME_ALIASES = {
  "Baroque Cloth": "Exquisite Cloth",
  "Cured Leather": "Worked Leather"
};
const REFINING_CITY_BONUSES = {
  Martlock: "Cuero",
  Bridgewatch: "Stone",
  Lymhurst: "Fibra",
  "Fort Sterling": "Madera",
  Thetford: "Metal"
};
const REFINING_CITY_RETURN_RATE = 0.4;
const CITY_GRAPH = {
  Caerleon: ["Bridgewatch", "Fort Sterling", "Lymhurst", "Martlock", "Thetford", "Brecilien"],
  Bridgewatch: ["Caerleon", "Martlock", "Thetford"],
  Martlock: ["Bridgewatch", "Caerleon", "Lymhurst"],
  "Fort Sterling": ["Caerleon", "Lymhurst", "Thetford"],
  Lymhurst: ["Fort Sterling", "Caerleon", "Martlock"],
  Thetford: ["Fort Sterling", "Caerleon", "Bridgewatch"],
  Brecilien: ["Caerleon"]
};
const KNOWN_CITIES = new Set(Object.keys(CITY_GRAPH));

const RESOURCE_LINES = [
  {
    family: "Metal",
    rawNames: ["Copper Ore", "Tin Ore", "Iron Ore", "Titanium Ore", "Runite Ore", "Meteorite Ore", "Adamantium Ore"],
    refinedNames: ["Copper Bar", "Bronze Bar", "Steel Bar", "Titanium Steel Bar", "Runite Steel Bar", "Meteorite Steel Bar", "Adamantium Steel Bar"],
    rawIdPrefix: "ORE",
    refinedIdPrefix: "METALBAR"
  },
  {
    family: "Madera",
    rawNames: ["Birch Logs", "Chestnut Logs", "Pine Logs", "Cedar Logs", "Bloodoak Logs", "Ashenbark Logs", "Whitewood Logs"],
    refinedNames: ["Birch Planks", "Chestnut Planks", "Pine Planks", "Cedar Planks", "Bloodoak Planks", "Ashenbark Planks", "Whitewood Planks"],
    rawIdPrefix: "WOOD",
    refinedIdPrefix: "PLANKS"
  },
  {
    family: "Fibra",
    rawNames: ["Cotton", "Flax", "Hemp", "Skyflower", "Sunflax", "Ghost Hemp", "Fogflower"],
    refinedNames: ["Simple Cloth", "Neat Cloth", "Fine Cloth", "Ornate Cloth", "Lavish Cloth", "Opulent Cloth", "Exquisite Cloth"],
    rawIdPrefix: "FIBER",
    refinedIdPrefix: "CLOTH"
  },
  {
    family: "Cuero",
    rawNames: ["Rugged Hide", "Thin Hide", "Medium Hide", "Heavy Hide", "Thick Hide", "Robust Hide", "Resilient Hide"],
    refinedNames: ["Stiff Leather", "Thick Leather", "Reinforced Leather", "Worked Leather", "Hardened Leather", "Fortified Leather", "Imbued Leather"],
    rawIdPrefix: "HIDE",
    refinedIdPrefix: "LEATHER"
  },
  {
    family: "Stone",
    rawNames: ["Limestone", "Sandstone", "Travertine", "Granite", "Slate", "Basalt", "Marble"],
    refinedNames: ["Limestone Block", "Sandstone Block", "Travertine Block", "Granite Block", "Slate Block", "Basalt Block", "Marble Block"],
    rawIdPrefix: "ROCK",
    refinedIdPrefix: "STONEBLOCK"
  }
];

const QUICK_ITEMS = RESOURCE_LINES.flatMap((line) =>
  line.rawNames.flatMap((rawName, index) => {
    const tier = index + 2;
    const refinedName = line.refinedNames[index];
    return [
      { name: rawName, iconId: buildTieredId(tier, line.rawIdPrefix) },
      { name: refinedName, iconId: buildTieredId(tier, line.refinedIdPrefix) }
    ];
  })
);

const FISH_ITEMS = [
  "Striped Carp",
  "Common Rudd",
  "Albion Perch",
  "Bluescale Pike",
  "Spotted Trout",
  "Brightscale Zander",
  "River Sturgeon",
  "Danglemouth Catfish",
  "Greenriver Eel",
  "Redspring Eel",
  "Deadwater Eel",
  "Whitefog Snapper",
  "Clearhaze Snapper",
  "Puremist Snapper",
  "Upland Coldeye",
  "Mountain Blindeye",
  "Frostpeak Deadeye",
  "Stonestream Lurcher",
  "Rushwater Lurcher",
  "Thunderfall Lurcher",
  "Lowriver Crab",
  "Drybrook Crab",
  "Dusthole Crab",
  "Greenmoor Clam",
  "Murkwater Clam",
  "Blackbog Clam",
  "Shallowshore Squid",
  "Midwater Octopus",
  "Deepwater Kraken",
  "Common Herring",
  "Striped Mackerel",
  "Flatshore Plaice",
  "Bluescale Cod",
  "Spotted Wolffish",
  "Strongfin Salmon",
  "Bluefin Tuna",
  "Steelscale Swordfish",
  "Seaweed",
  "Basic Fish Sauce",
  "Fancy Fish Sauce",
  "Special Fish Sauce",
  "Chopped Fish"
];
const EXACT_INGREDIENT_ICON_IDS = window.__ALBION_INGREDIENT_ICONS__ || {};
const MANUAL_ICON_IDS = {
  "Common Rudd": "T1_FISH_FRESHWATER_ALL_COMMON",
  "Striped Carp": "T2_FISH_FRESHWATER_ALL_COMMON",
  "Albion Perch": "T3_FISH_FRESHWATER_ALL_COMMON",
  "Bluescale Pike": "T4_FISH_FRESHWATER_ALL_COMMON",
  "Spotted Trout": "T5_FISH_FRESHWATER_ALL_COMMON",
  "Brightscale Zander": "T6_FISH_FRESHWATER_ALL_COMMON",
  "Danglemouth Catfish": "T7_FISH_FRESHWATER_ALL_COMMON",
  "River Sturgeon": "T8_FISH_FRESHWATER_ALL_COMMON",
  "Common Herring": "T1_FISH_SALTWATER_ALL_COMMON",
  "Striped Mackerel": "T2_FISH_SALTWATER_ALL_COMMON",
  "Flatshore Plaice": "T3_FISH_SALTWATER_ALL_COMMON",
  "Bluescale Cod": "T4_FISH_SALTWATER_ALL_COMMON",
  "Spotted Wolffish": "T5_FISH_SALTWATER_ALL_COMMON",
  "Strongfin Salmon": "T6_FISH_SALTWATER_ALL_COMMON",
  "Bluefin Tuna": "T7_FISH_SALTWATER_ALL_COMMON",
  "Steelscale Swordfish": "T8_FISH_SALTWATER_ALL_COMMON",
  Seaweed: "T1_SEAWEED",
  "Chopped Fish": "T1_FISHCHOPS",
  "Basic Fish Sauce": "T1_FISHSAUCE_LEVEL1",
  "Fancy Fish Sauce": "T1_FISHSAUCE_LEVEL2",
  "Special Fish Sauce": "T1_FISHSAUCE_LEVEL3",
  "Grilled Fish": "T1_MEAL_GRILLEDFISH",
  "Seaweed Salad": "T1_MEAL_SEAWEEDSALAD"
};
const EXTRA_SEARCHABLE_TARGETS = new Set([
  "Chopped Fish",
  "Basic Fish Sauce",
  "Fancy Fish Sauce",
  "Special Fish Sauce",
  "Grilled Fish",
  "Seaweed Salad"
]);

const inventory = loadInventory();
const routeSettings = loadRouteSettings();
let recipes = [];
let categoryOptions = [ALL_CATEGORIES];
let itemIconMap = new Map();
let recipeIndex = new Map();
let ingredientRecipeIndex = new Map();
let plannerCache = [];
let finalRecipeCandidates = [];
let plannerTimer = null;
let plannerInventoryKey = "";
let pickerRenderTimer = null;
let searchableMaterials = [];
let searchableTargets = [];
let plannerDirty = true;
let plannerRunning = false;
let targetPlannerRunning = false;
let selectedTargetName = "";
let plannerWorker = null;
let workerRequestCounter = 0;
const workerRequests = new Map();
let detectedScreenshotMatches = [];
let screenshotObjectUrl = "";
let screenshotRecognitionRunning = false;
let screenshotBitmap = null;
let screenshotSelection = null;
let screenshotDragState = null;
const iconDescriptorCache = new Map();
let screenshotMaterialCandidates = [];

const inventoryList = document.querySelector("#inventory-list");
const materialPickerSearch = document.querySelector("#material-picker-search");
const materialPickerResults = document.querySelector("#material-picker-results");
const targetPickerSearch = document.querySelector("#target-picker-search");
const targetPickerResults = document.querySelector("#target-picker-results");
const selectedTarget = document.querySelector("#selected-target");
const targetAmountInput = document.querySelector("#target-amount-input");
const analyzeTargetButton = document.querySelector("#analyze-target-button");
const targetPlan = document.querySelector("#target-plan");
const bulkInput = document.querySelector("#bulk-input");
const applyBulkButton = document.querySelector("#apply-bulk-button");
const screenshotFileInput = document.querySelector("#screenshot-file-input");
const screenshotSlotSizeInput = document.querySelector("#screenshot-slot-size");
const screenshotScanButton = document.querySelector("#screenshot-scan-button");
const screenshotImportButton = document.querySelector("#screenshot-import-button");
const screenshotClearButton = document.querySelector("#screenshot-clear-button");
const screenshotStatus = document.querySelector("#screenshot-status");
const screenshotPreviewShell = document.querySelector("#screenshot-preview-shell");
const screenshotPreview = document.querySelector("#screenshot-preview");
const screenshotSelectionBox = document.querySelector("#screenshot-selection");
const screenshotPreviewEmpty = document.querySelector("#screenshot-preview-empty");
const screenshotResults = document.querySelector("#screenshot-results");
const resetButton = document.querySelector("#reset-button");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const statusText = document.querySelector("#status-text");
const statusSpinner = document.querySelector("#status-spinner");
const reloadDataButton = document.querySelector("#reload-data-button");
const analyzeButton = document.querySelector("#analyze-button");
const startingCitySelect = document.querySelector("#starting-city");
const bestPlan = document.querySelector("#best-plan");
const planList = document.querySelector("#plan-list");
const bestTier = document.querySelector("#best-tier");
const planStepsCount = document.querySelector("#plan-steps-count");
const reachableCount = document.querySelector("#reachable-count");
const trackedCount = document.querySelector("#tracked-count");

bootstrap();

function bootstrap() {
  bindEvents();
  loadCatalog();
}

function bindEvents() {
  inventoryList.addEventListener("input", handleInventoryInput);
  inventoryList.addEventListener("change", handleInventoryCommit);
  inventoryList.addEventListener("click", handleInventoryRemove);
  materialPickerSearch.addEventListener("input", renderMaterialPicker);
  materialPickerResults.addEventListener("click", handleMaterialPickerAdd);
  targetPickerSearch.addEventListener("input", renderTargetPicker);
  targetPickerResults.addEventListener("click", handleTargetPickerSelect);
  searchInput.addEventListener("input", () => renderPlanner(false));
  categoryFilter.addEventListener("change", () => renderPlanner(false));
  startingCitySelect.addEventListener("change", handleStartingCityChange);
  analyzeButton.addEventListener("click", () => {
    if (plannerRunning) return;
    plannerDirty = false;
    plannerInventoryKey = "";
    setPlannerRunning(true, "Analyzing recipes and searching possible chains...");
    window.setTimeout(async () => {
      try {
        await renderPlanner(true);
      } finally {
        setPlannerRunning(false);
      }
    }, 40);
  });
  analyzeTargetButton.addEventListener("click", () => {
    if (targetPlannerRunning || !selectedTargetName) return;
    const amount = Math.max(1, Number(targetAmountInput.value) || 1);
    targetAmountInput.value = amount;
    setTargetPlannerRunning(true);
    window.setTimeout(async () => {
      try {
        await renderTargetPlan(selectedTargetName, amount);
      } finally {
        setTargetPlannerRunning(false);
      }
    }, 40);
  });

  applyBulkButton.addEventListener("click", () => {
    bulkInput.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [rawName, rawAmount] = line.split("=");
        if (!rawName || rawAmount === undefined) return;

        inventory[rawName.trim()] = Math.max(0, Number(rawAmount.trim()) || 0);
      });

    saveInventory();
    renderInventory();
    renderMaterialPicker();
    markPlannerDirty();
  });

  screenshotFileInput.addEventListener("change", handleScreenshotSelection);
  screenshotScanButton.addEventListener("click", scanScreenshotInventory);
  screenshotImportButton.addEventListener("click", importDetectedScreenshotMaterials);
  screenshotClearButton.addEventListener("click", clearScreenshotImport);
  screenshotPreview.addEventListener("mousedown", beginScreenshotSelection);
  window.addEventListener("mousemove", updateScreenshotSelection);
  window.addEventListener("mouseup", finishScreenshotSelection);

  resetButton.addEventListener("click", () => {
    Object.keys(inventory).forEach((name) => {
      inventory[name] = 0;
    });

    bulkInput.value = "";
    saveInventory();
    renderInventory();
    renderMaterialPicker();
    markPlannerDirty();
  });

  reloadDataButton.addEventListener("click", () => {
    window.location.reload();
  });
}

function handleInventoryInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.dataset.material) return;

  inventory[target.dataset.material] = Math.max(0, Number(target.value) || 0);
  updateTrackedCount();
  updateInventoryCard(target.dataset.material);
  scheduleMaterialPickerRefresh();
  markPlannerDirty();
}

function handleInventoryCommit(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.dataset.material) return;

  const material = target.dataset.material;
  const amount = Math.max(0, Number(target.value) || 0);

  if (amount > 0) {
    inventory[material] = amount;
  } else {
    delete inventory[material];
  }

  saveInventory();
  renderInventory();
  scheduleMaterialPickerRefresh();
  markPlannerDirty();
}

function handleInventoryRemove(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (!target.classList.contains("inventory-current-item__remove")) return;

  const material = target.dataset.material;
  if (!material) return;

  delete inventory[material];
  saveInventory();
  renderInventory();
  scheduleMaterialPickerRefresh();
  markPlannerDirty();
}

function loadCatalog() {
  setStatus("Loading exact local catalog...");

  const localCatalog = window.__ALBION_CATALOG__;
  if (!localCatalog || !Array.isArray(localCatalog.recipes)) {
    setStatus("Local catalog not found.");
    return;
  }

  const generatedAt = localCatalog.generatedAt
    ? new Date(localCatalog.generatedAt).toLocaleString("es-ES")
    : "";

  recipes = buildPlannerRecipes(localCatalog.recipes);
  applyRouteSettingsToControls();
  ensureMaterials(collectAllTrackableNames(recipes));
  itemIconMap = buildItemIconMap(recipes);
  recipeIndex = buildRecipeIndex(recipes);
  ingredientRecipeIndex = buildIngredientRecipeIndex(recipes);
  finalRecipeCandidates = recipes
    .filter(isFinalRecipe)
    .filter((recipe) => !recipe.enchanted)
    .sort((left, right) => scoreRecipe(right) - scoreRecipe(left));
  initializePlannerWorker(recipes);
  searchableMaterials = collectSearchableMaterials(recipes);
  searchableTargets = collectSearchableTargets(recipes);
  screenshotMaterialCandidates = searchableMaterials
    .map((name) => ({ name, iconId: itemIconMap.get(name) }))
    .filter((entry) => entry.iconId);
  categoryOptions = [ALL_CATEGORIES, ...new Set(recipes.filter(isFinalRecipe).map((recipe) => recipe.category))];

  renderInventory();
  renderMaterialPicker();
  renderTargetPicker();
  renderSelectedTarget();
  targetPlan.innerHTML = `<p class="helper-text">Select a target item and click Analyze Target to see the required chain.</p>`;
  renderCategoryOptions();
  renderPlanner(false);

  setStatus(
    `Exact local catalog loaded (${localCatalog.recipes.length} exact recipes${generatedAt ? `, generated ${generatedAt}` : ""}).`
  );
}

function handleStartingCityChange() {
  routeSettings.startingCity = startingCitySelect.value;
  saveRouteSettings();
  plannerInventoryKey = "";
  markPlannerDirty();
}

function buildPlannerRecipes(catalogRecipes) {
  const baseRecipes = catalogRecipes
    .filter((recipe) => recipe.exact)
    .map((recipe) => ({
      ...recipe,
      ingredients: normalizeIngredients(recipe.ingredients),
      outputName: recipe.name,
      outputId: String(recipe.id || "").split("@")[0],
      plannerCategory: recipe.category,
      plannerType: "craft",
      priority: recipePriority(recipe.category)
    }));

  const exactOutputNames = new Set(baseRecipes.map((recipe) => recipe.outputName));

  return [...buildRefiningRecipes(), ...buildSupplementalRecipes(exactOutputNames), ...baseRecipes];
}

function buildSupplementalRecipes(existingOutputs = new Set()) {
  const standardAccessories = [
    { tier: 2, id: "T2_BAG", name: "Novice's Bag", station: "Toolmaker", ingredients: { "Stiff Leather": 8 } },
    { tier: 3, id: "T3_BAG", name: "Journeyman's Bag", station: "Toolmaker", ingredients: { "Thick Leather": 8 } },
    { tier: 4, id: "T4_BAG", name: "Adept's Bag", station: "Toolmaker", ingredients: { "Reinforced Leather": 8 } },
    { tier: 5, id: "T5_BAG", name: "Expert's Bag", station: "Toolmaker", ingredients: { "Worked Leather": 8 } },
    { tier: 6, id: "T6_BAG", name: "Master's Bag", station: "Toolmaker", ingredients: { "Hardened Leather": 8 } },
    { tier: 7, id: "T7_BAG", name: "Grandmaster's Bag", station: "Toolmaker", ingredients: { "Fortified Leather": 8 } },
    { tier: 8, id: "T8_BAG", name: "Elder's Bag", station: "Toolmaker", ingredients: { "Imbued Leather": 8 } },
    { tier: 2, id: "T2_OFF_TORCH", name: "Novice's Torch", station: "Toolmaker", ingredients: { "Birch Planks": 8 } },
    { tier: 3, id: "T3_OFF_TORCH", name: "Journeyman's Torch", station: "Toolmaker", ingredients: { "Chestnut Planks": 8 } },
    { tier: 4, id: "T4_OFF_TORCH", name: "Adept's Torch", station: "Toolmaker", ingredients: { "Pine Planks": 8 } },
    { tier: 5, id: "T5_OFF_TORCH", name: "Expert's Torch", station: "Toolmaker", ingredients: { "Cedar Planks": 8 } },
    { tier: 6, id: "T6_OFF_TORCH", name: "Master's Torch", station: "Toolmaker", ingredients: { "Bloodoak Planks": 8 } },
    { tier: 7, id: "T7_OFF_TORCH", name: "Grandmaster's Torch", station: "Toolmaker", ingredients: { "Ashenbark Planks": 8 } },
    { tier: 8, id: "T8_OFF_TORCH", name: "Elder's Torch", station: "Toolmaker", ingredients: { "Whitewood Planks": 8 } },
    { tier: 8, id: "T8_2H_AXE", name: "Elder's Greataxe", station: "Forge", ingredients: { "Whitewood Planks": 12, "Adamantium Steel Bar": 20 } },
    { tier: 8, id: "T8_2H_FIRESTAFF", name: "Elder's Great Fire Staff", station: "Arcane Forge", ingredients: { "Whitewood Planks": 20, "Adamantium Steel Bar": 12 } },
      { tier: 8, id: "T8_OFF_BOOK", name: "Elder's Tome of Spells", station: "Arcane Forge", ingredients: { "Exquisite Cloth": 4, "Imbued Leather": 4 } }
    ];
  const fishProcessingRecipes = [
    { id: "SUPPLEMENT_FISHCHOPS_RUDD", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 2, output: 1, station: "Cook", ingredients: { "Common Rudd": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_CARP", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 2, output: 2, station: "Cook", ingredients: { "Striped Carp": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_PERCH", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 3, output: 3, station: "Cook", ingredients: { "Albion Perch": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_PIKE", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 4, output: 4, station: "Cook", ingredients: { "Bluescale Pike": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_TROUT", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 5, output: 6, station: "Cook", ingredients: { "Spotted Trout": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_ZANDER", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 6, output: 8, station: "Cook", ingredients: { "Brightscale Zander": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_CATFISH", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 7, output: 10, station: "Cook", ingredients: { "Danglemouth Catfish": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_STURGEON", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 8, output: 14, station: "Cook", ingredients: { "River Sturgeon": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_HERRING", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 2, output: 1, station: "Cook", ingredients: { "Common Herring": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_MACKEREL", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 2, output: 2, station: "Cook", ingredients: { "Striped Mackerel": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_PLAICE", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 3, output: 3, station: "Cook", ingredients: { "Flatshore Plaice": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_COD", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 4, output: 4, station: "Cook", ingredients: { "Bluescale Cod": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_WOLFFISH", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 5, output: 6, station: "Cook", ingredients: { "Spotted Wolffish": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_SALMON", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 6, output: 8, station: "Cook", ingredients: { "Strongfin Salmon": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_TUNA", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 7, output: 10, station: "Cook", ingredients: { "Bluefin Tuna": 1 } },
    { id: "SUPPLEMENT_FISHCHOPS_SWORDFISH", outputId: "T1_FISHCHOPS", name: "Chopped Fish", category: "Consumibles", tier: 8, output: 14, station: "Cook", ingredients: { "Steelscale Swordfish": 1 } },
    { id: "SUPPLEMENT_FISHSAUCE_LEVEL1", outputId: "T1_FISHSAUCE_LEVEL1", name: "Basic Fish Sauce", category: "Consumibles", tier: 3, output: 1, station: "Cook", ingredients: { "Chopped Fish": 15, Seaweed: 1 } },
    { id: "SUPPLEMENT_FISHSAUCE_LEVEL2", outputId: "T1_FISHSAUCE_LEVEL2", name: "Fancy Fish Sauce", category: "Consumibles", tier: 5, output: 1, station: "Cook", ingredients: { "Chopped Fish": 45, Seaweed: 3 } },
    { id: "SUPPLEMENT_FISHSAUCE_LEVEL3", outputId: "T1_FISHSAUCE_LEVEL3", name: "Special Fish Sauce", category: "Consumibles", tier: 7, output: 1, station: "Cook", ingredients: { "Chopped Fish": 135, Seaweed: 9 } },
    { id: "SUPPLEMENT_MEAL_FISH", outputId: "T1_MEAL_FISH", name: "Grilled Fish", category: "Consumibles", tier: 2, output: 10, station: "Cook", ingredients: { "Chopped Fish": 10 } },
    { id: "SUPPLEMENT_MEAL_SALAD_FISHING", outputId: "T1_MEAL_SALAD_FISHING", name: "Seaweed Salad", category: "Consumibles", tier: 2, output: 10, station: "Cook", ingredients: { Seaweed: 10 } }
  ];
  const supplementalRecipes = [...standardAccessories, ...fishProcessingRecipes];

  return supplementalRecipes
    .filter((entry) => !existingOutputs.has(entry.name) || entry.name === "Chopped Fish")
    .map((entry) => ({
      id: `${entry.id}@0`,
      name: entry.name,
      outputName: entry.name,
      outputId: entry.outputId || entry.id,
      category: entry.category || "Accesorios",
      plannerCategory: entry.category || "Accesorios",
      plannerType: "craft",
      tier: `${entry.tier}.0`,
      output: entry.output || 1,
      source: "Supplemental standard recipe",
      craftedAt: entry.station,
      ingredients: entry.ingredients,
      exact: false,
      enchanted: false,
      priority: recipePriority(entry.category || "Accesorios")
    }));
}

function isLikelyNonCraftable(name) {
  const value = String(name || "");
  return [
    "Recruiter's ",
    "Silver ",
    "Gold ",
    "Crystal "
  ].some((prefix) => value.startsWith(prefix));
}

function normalizeIngredients(ingredients) {
  return Object.entries(ingredients || {}).reduce((result, [name, count]) => {
    const normalizedName = MATERIAL_NAME_ALIASES[name] || name;
    result[normalizedName] = (result[normalizedName] || 0) + count;
    return result;
  }, {});
}

function buildRefiningRecipes() {
  const refineRecipes = [];

  RESOURCE_LINES.forEach((line) => {
    line.refinedNames.forEach((refinedName, index) => {
      const tier = index + 2;
      const rawName = line.rawNames[index];
      const ingredients = {};

      if (tier === 2) {
        ingredients[rawName] = 1;
      } else {
        ingredients[rawName] = 2;
        ingredients[line.refinedNames[index - 1]] = 1;
      }

      refineRecipes.push({
        id: `REFINE_${buildTieredId(tier, line.refinedIdPrefix)}`,
        name: `Refine ${refinedName}`,
        outputName: refinedName,
        outputId: buildTieredId(tier, line.refinedIdPrefix),
        category: "Refining",
        plannerCategory: "Refining",
        plannerType: "refine",
        tier: `${tier}.0`,
        output: 1,
        source: "Base refining rule",
        craftedAt: refineStationFor(line.family),
        ingredients,
        exact: false,
        enchanted: false,
        priority: tier * 6
      });
    });
  });

  return refineRecipes;
}

function refineStationFor(family) {
  switch (family) {
    case "Metal":
      return "Smelter";
    case "Madera":
      return "Lumbermill";
    case "Fibra":
      return "Weaver";
    case "Cuero":
      return "Tanner";
    case "Stone":
      return "Stonecutter";
    default:
      return "Refining Station";
  }
}

function buildItemIconMap(recipeList) {
  const map = new Map();

  QUICK_ITEMS.forEach((item) => {
    map.set(item.name, item.iconId);
  });

  Object.entries(EXACT_INGREDIENT_ICON_IDS).forEach(([name, iconId]) => {
    map.set(name, iconId);
  });

  Object.entries(MANUAL_ICON_IDS).forEach(([name, iconId]) => {
    map.set(name, iconId);
  });

  recipeList.forEach((recipe) => {
    if (recipe.outputId && !map.has(recipe.outputName)) {
      map.set(recipe.outputName, recipe.outputId);
    }
  });

  Array.from(map.entries()).forEach(([name, iconId]) => {
    const normalizedName = normalizeIconLookupName(name);
    if (normalizedName && !map.has(normalizedName)) {
      map.set(normalizedName, iconId);
    }
  });

  return map;
}

function normalizeIconLookupName(name) {
  const baseName = MATERIAL_NAME_ALIASES[name] || name;
  return String(baseName || "")
    .replace(/^(Uncommon|Rare|Exceptional|Pristine|Fine|Excellent)\s+/, "")
    .trim();
}

function buildRecipeIndex(recipeList) {
  const index = new Map();

  recipeList.forEach((recipe) => {
    if (recipe.enchanted) return;
    if (!index.has(recipe.outputName)) {
      index.set(recipe.outputName, []);
    }

    index.get(recipe.outputName).push(recipe);
  });

  index.forEach((list) => {
    list.sort((left, right) => scoreRecipe(right) - scoreRecipe(left));
  });

  return index;
}

function buildIngredientRecipeIndex(recipeList) {
  const index = new Map();

  recipeList.forEach((recipe) => {
    Object.keys(recipe.ingredients).forEach((ingredient) => {
      if (!index.has(ingredient)) {
        index.set(ingredient, []);
      }

      index.get(ingredient).push(recipe);
    });
  });

  index.forEach((list) => {
    list.sort((left, right) => scoreRecipe(right) - scoreRecipe(left));
  });

  return index;
}

function renderInventory() {
  const template = document.querySelector("#inventory-current-template");
  const names = Object.keys(inventory)
    .filter((name) => (inventory[name] || 0) > 0)
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 80);

  inventoryList.innerHTML = "";

  names.forEach((name) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const input = node.querySelector(".inventory-current-item__input");
    const removeButton = node.querySelector(".inventory-current-item__remove");

    node.querySelector(".inventory-current-item__name").textContent = name;
    node.querySelector(".inventory-current-item__meta").textContent = `Current amount: ${inventory[name] || 0}`;
    input.dataset.material = name;
    input.value = inventory[name] || 0;
    removeButton.dataset.material = name;

    hydrateIcon(node.querySelector(".item-avatar"), name);
    inventoryList.appendChild(node);
  });

  if (!names.length) {
    inventoryList.innerHTML = `<p class="helper-text">You have not added materials yet.</p>`;
  }

  trackedCount.textContent = `${Object.values(inventory).filter((amount) => amount > 0).length} materials`;
}

function renderMaterialPicker() {
  const template = document.querySelector("#material-picker-template");
  const search = materialPickerSearch.value.trim().toLowerCase();
  const names = searchableMaterials
    .filter((name) => !search || name.toLowerCase().includes(search))
    .sort((left, right) => {
      const leftStarts = left.toLowerCase().startsWith(search) ? 1 : 0;
      const rightStarts = right.toLowerCase().startsWith(search) ? 1 : 0;
      if (rightStarts !== leftStarts) return rightStarts - leftStarts;
      return left.localeCompare(right);
    })
    .slice(0, search ? 24 : 12);

  materialPickerResults.innerHTML = "";

  names.forEach((name) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const input = node.querySelector(".picker-card__input");
    const button = node.querySelector(".picker-card__button");
    const amount = inventory[name] || 0;

    node.querySelector(".picker-card__name").textContent = name;
    node.querySelector(".picker-card__meta").textContent = amount > 0 ? `In inventory: ${amount}` : "Not added yet";
    input.dataset.material = name;
    button.dataset.material = name;

    hydrateIcon(node.querySelector(".item-avatar"), name);
    materialPickerResults.appendChild(node);
  });

  if (!names.length) {
    materialPickerResults.innerHTML = `<p class="helper-text">No materials found with that name.</p>`;
  }
}

function handleMaterialPickerAdd(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (!target.dataset.material) return;

  const card = target.closest(".picker-card");
  const input = card ? card.querySelector(".picker-card__input") : null;
  const amount = input instanceof HTMLInputElement ? Math.max(1, Number(input.value) || 1) : 1;
  const material = target.dataset.material;

  inventory[material] = (inventory[material] || 0) + amount;
  saveInventory();
  renderInventory();
  scheduleMaterialPickerRefresh();
  markPlannerDirty();
}

function handleTargetPickerSelect(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (!target.dataset.material) return;

  selectedTargetName = target.dataset.material;
  renderSelectedTarget();
}

function renderCategoryOptions() {
  categoryFilter.innerHTML = categoryOptions
    .map((option) => `<option value="${option}">${translateCategory(option)}</option>`)
    .join("");
}

function renderTargetPicker() {
  const template = document.querySelector("#material-picker-template");
  const search = targetPickerSearch.value.trim().toLowerCase();
  const names = searchableTargets
    .filter((name) => !search || name.toLowerCase().includes(search))
    .sort((left, right) => {
      const leftStarts = left.toLowerCase().startsWith(search) ? 1 : 0;
      const rightStarts = right.toLowerCase().startsWith(search) ? 1 : 0;
      if (rightStarts !== leftStarts) return rightStarts - leftStarts;
      return left.localeCompare(right);
    })
    .slice(0, search ? 18 : 8);

  targetPickerResults.innerHTML = "";

  names.forEach((name) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const input = node.querySelector(".picker-card__input");
    const button = node.querySelector(".picker-card__button");
    const recipe = getPrimaryRecipeForName(name);

    node.querySelector(".picker-card__name").textContent = name;
    node.querySelector(".picker-card__meta").textContent = recipe
      ? `${translateCategory(recipe.category)} | T${parseTier(recipe.tier)}`
      : "Craft target";
    input.remove();
    button.dataset.material = name;
    button.textContent = selectedTargetName === name ? "Selected" : "Select";

    hydrateIcon(node.querySelector(".item-avatar"), name, recipe?.outputId);
    targetPickerResults.appendChild(node);
  });

  if (!names.length) {
    targetPickerResults.innerHTML = `<p class="helper-text">No targets found with that name.</p>`;
  }
}

function renderSelectedTarget() {
  if (!selectedTargetName) {
    selectedTarget.className = "selected-target helper-text";
    selectedTarget.innerHTML = "No target selected yet.";
    setTargetPlannerRunning(false);
    return;
  }

  const recipe = getPrimaryRecipeForName(selectedTargetName);
  selectedTarget.className = "selected-target";
  selectedTarget.innerHTML = `
    <span class="item-avatar item-avatar--large">
      <img class="item-avatar__img" alt="" loading="lazy">
      <span class="item-avatar__fallback"></span>
    </span>
    <div class="selected-target__content">
      <h3 class="selected-target__name">${selectedTargetName}</h3>
      <p class="selected-target__meta">${recipe ? `${translateCategory(recipe.category)} | T${parseTier(recipe.tier)} | ${recipe.craftedAt || "No station"}` : "Craft target"}</p>
    </div>
  `;
  hydrateIcon(selectedTarget.querySelector(".item-avatar"), selectedTargetName, recipe?.outputId);
  renderTargetPicker();
  setTargetPlannerRunning(false);
}

async function renderPlanner(forceCompute = false) {
  if (!recipes.length) return;

  if (forceCompute) {
    const inventoryKey = buildInventoryKey(inventory);
    if (plannerInventoryKey !== inventoryKey) {
      plannerCache = await analyzeInventoryWithWorker(inventory, inventoryKey);
      plannerInventoryKey = inventoryKey;
    }
    plannerDirty = false;
    setStatus(`Analysis complete. Found ${plannerCache.length} reachable option(s).`);
  }

  const search = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value || ALL_CATEGORIES;
  const plans = plannerCache
    .filter((plan) => plan.recipe.outputName.toLowerCase().includes(search))
    .filter((plan) => selectedCategory === ALL_CATEGORIES || plan.recipe.category === selectedCategory);
  renderBestPlan(plans[0] || null);
  renderPlanList(plans.slice(0, 12));

  reachableCount.textContent = String(plans.length);
}

function schedulePlannerRender(immediate = false) {
  if (plannerTimer) {
    window.clearTimeout(plannerTimer);
    plannerTimer = null;
  }

  const run = () => {
    plannerTimer = null;
    renderPlanner();
  };

  if (immediate) {
    run();
    return;
  }

  plannerTimer = window.setTimeout(run, 90);
}

function markPlannerDirty() {
  plannerDirty = true;
  if (selectedTargetName) {
    targetPlan.innerHTML = `<p class="helper-text">Inventory updated. Run Analyze Target again to refresh the requirement plan.</p>`;
  }
  setStatus("Inventory updated. Click Analyze Recipes when you are ready.");
}

function scheduleMaterialPickerRefresh(immediate = false) {
  if (pickerRenderTimer) {
    window.clearTimeout(pickerRenderTimer);
    pickerRenderTimer = null;
  }

  const run = () => {
    pickerRenderTimer = null;
    renderMaterialPicker();
  };

  if (immediate) {
    run();
    return;
  }

  pickerRenderTimer = window.setTimeout(run, 120);
}

function renderBestPlan(plan) {
  if (plannerDirty) {
    bestPlan.innerHTML = `
      <article class="plan-card">
        <div class="plan-card__top">
          <div>
            <p class="plan-card__category">Ready to analyze</p>
            <h3 class="plan-card__name">Add all your materials first, then run the planner</h3>
          </div>
          <span class="plan-card__badge">Waiting</span>
        </div>
        <p class="plan-card__meta">The planner is paused. Click Analyze Recipes to calculate recommendations.</p>
      </article>
    `;
    bestTier.textContent = "-";
    planStepsCount.textContent = "0";
    reachableCount.textContent = "0";
    return;
  }

  bestPlan.innerHTML = "";

  if (!plan) {
    bestPlan.innerHTML = `
      <article class="plan-card plan-card--blocked">
        <div class="plan-card__top">
          <div>
            <p class="plan-card__category">No plan</p>
            <h3 class="plan-card__name">I cannot find a complete chain with the current inventory</h3>
          </div>
          <span class="plan-card__badge">0 options</span>
        </div>
        <p class="plan-card__meta">Try adding refined resources or base raw materials such as Iron Ore, Pine Logs, Flax or Thin Hide.</p>
      </article>
    `;
    bestTier.textContent = "-";
    planStepsCount.textContent = "0";
    return;
  }

  const node = buildPlanNode(plan);
  node.open = true;
  bestPlan.appendChild(node);
  ensurePlanDetailsRendered(node, plan);

  bestTier.textContent = `T${parseTier(plan.recipe.tier)}`;
  planStepsCount.textContent = String(plan.steps.length);
}

function renderPlanList(plans) {
  if (plannerDirty) {
    planList.innerHTML = `<p class="helper-text">Analysis is paused until you click Analyze Recipes.</p>`;
    return;
  }

  planList.innerHTML = "";

  if (!plans.length) {
    planList.innerHTML = `<p class="helper-text">There are no reachable alternatives with the current filters.</p>`;
    return;
  }

  plans.forEach((plan) => {
    planList.appendChild(buildPlanNode(plan));
  });
}

function buildPlanNode(plan) {
  const template = document.querySelector("#plan-template");
  const node = template.content.firstElementChild.cloneNode(true);
  const avatar = node.querySelector(".item-avatar");
  const stepsList = node.querySelector(".plan-card__steps");
  const notes = node.querySelector(".plan-card__notes");

  node.querySelector(".plan-card__category").textContent =
    `${translateCategory(plan.recipe.category)} | T${parseTier(plan.recipe.tier)} | ${plan.recipe.craftedAt || "No station"}`;
  node.querySelector(".plan-card__name").textContent = plan.recipe.outputName;
  node.querySelector(".plan-card__badge").textContent = plan.badgeText || `x${plan.outputCount} | ${plan.steps.length} steps`;
  node.querySelector(".plan-card__meta").textContent =
    plan.metaText || `Reachable target with your current inventory. You can make it exactly ${plan.outputCount} time(s) with this inventory.`;
  stepsList.innerHTML = plan.steps
    .map((step) => `<li>${step}</li>`)
    .join("");
  notes.textContent =
    plan.notesText || `Final source: ${plan.recipe.source}. Consumed materials: ${summarizeConsumed(plan.consumed)}.`;
  node.querySelector(".plan-card__toggle").textContent = "";

  if (plan.detailData) {
    stepsList.hidden = true;
    notes.hidden = true;
    node.addEventListener("toggle", () => {
      if (node.open) {
        ensurePlanDetailsRendered(node, plan);
      }
    });
  } else {
    stepsList.hidden = false;
    notes.hidden = false;
  }

  hydrateIcon(avatar, plan.recipe.outputName, plan.recipe.outputId);
  return node;
}

function ensurePlanDetailsRendered(node, plan) {
  const extra = node.querySelector(".plan-card__extra");
  if (!extra || extra.childElementCount > 0 || !plan.detailData) return;

  extra.replaceChildren(
    buildPlanDetails(
      plan.detailData.stepEntries,
      plan.detailData.resourceList,
      plan.detailData.resourceTitle,
      plan.detailData.emptyResourceText,
      plan.detailData.consumed
    )
  );
}

async function renderTargetPlan(targetName, desiredAmount) {
  const analysis = await analyzeTargetWithWorker(targetName, desiredAmount, inventory);
  if (!analysis.found) {
    targetPlan.innerHTML = `
      <article class="plan-card plan-card--blocked">
        <div class="plan-card__top">
          <div>
            <p class="plan-card__category">Target</p>
            <h3 class="plan-card__name">I cannot find a recipe for that target</h3>
          </div>
          <span class="plan-card__badge">Unavailable</span>
        </div>
      </article>
    `;
    return;
  }

  const targetPlanData = {
    recipe: analysis.recipe,
    outputCount: analysis.outputCount,
    steps: analysis.stepEntries.map((entry) => describeStep(entry.recipe, entry.runs)),
    consumed: analysis.consumed,
    badgeText: analysis.resourceList.length ? "Missing resources" : "Ready path",
    metaText: analysis.resourceList.length
      ? `You do not have enough materials yet. This plan shows the exact steps plus what is still missing for ${analysis.outputCount} unit(s).`
      : `You already have enough resources to craft ${analysis.outputCount} unit(s) with this chain.`,
    notesText: analysis.resourceList.length
      ? `Missing resources: ${analysis.resourceList.map(([name, amount]) => `${name} x${amount}`).join(", ")}.`
      : `No extra resources are missing. Consumed materials: ${summarizeConsumed(analysis.consumed)}.`,
    detailData: {
      stepEntries: analysis.stepEntries,
      resourceList: analysis.resourceList,
      resourceTitle: analysis.resourceTitle,
      emptyResourceText: analysis.emptyResourceText,
      consumed: analysis.consumed
    }
  };
  const node = buildPlanNode(targetPlanData);

  targetPlan.innerHTML = "";
  node.open = true;
  targetPlan.appendChild(node);
  ensurePlanDetailsRendered(node, targetPlanData);
}

function buildReachablePlans(sourceInventory) {
  const plans = [];
  const relevantRecipeSet = collectRelevantRecipes(sourceInventory);
  const candidatePool = finalRecipeCandidates.filter((recipe) => relevantRecipeSet.has(recipe.id));

  for (const recipe of candidatePool) {
    const result = craftAsManyAsPossible(recipe, cloneStock(sourceInventory));
    if (!result) continue;
    const consumed = collectConsumed(sourceInventory, result.stock);

    plans.push({
      recipe,
      outputCount: result.outputCount,
      steps: summarizeSteps(result.steps),
      consumed,
      detailData: {
        stepEntries: aggregateStepObjects(result.steps),
        resourceList: toNamedAmountList(consumed),
        resourceTitle: "Consumed materials",
        emptyResourceText: "This route uses the materials already present in your inventory.",
        consumed
      }
    });

    if (plans.length >= 40) break;
  }

  if (!plans.length) {
    for (const recipe of recipes.filter((entry) => entry.plannerType === "refine" && relevantRecipeSet.has(entry.id))) {
      const result = craftAsManyAsPossible(recipe, cloneStock(sourceInventory));
      if (!result) continue;
      const consumed = collectConsumed(sourceInventory, result.stock);

      plans.push({
        recipe,
        outputCount: result.outputCount,
        steps: summarizeSteps(result.steps),
        consumed,
        detailData: {
          stepEntries: aggregateStepObjects(result.steps),
          resourceList: toNamedAmountList(consumed),
          resourceTitle: "Consumed materials",
          emptyResourceText: "This route uses the materials already present in your inventory.",
          consumed
        }
      });
    }
  }

  return plans.sort((left, right) => {
    const scoreDiff = scoreRecipe(right.recipe) - scoreRecipe(left.recipe);
    if (scoreDiff !== 0) return scoreDiff;
    if (right.outputCount !== left.outputCount) return right.outputCount - left.outputCount;
    return left.steps.length - right.steps.length;
  });
}

function planTargetRequirements(recipe, desiredAmount, sourceInventory) {
  const stock = cloneStock(sourceInventory);
  const steps = [];
  const missing = {};
  const runs = Math.ceil(desiredAmount / Math.max(1, recipe.output || 1));

  for (let run = 0; run < runs; run += 1) {
    const resolved = resolveRecipeWithRequirements(recipe, stock, new Set(), 0);
    steps.push(...resolved.steps);
    mergeCounts(missing, resolved.missing);
  }

  return { stock, steps, missing };
}

function collectRelevantRecipes(sourceInventory) {
  const relevant = new Set();
  const queue = Object.entries(sourceInventory)
    .filter(([, amount]) => amount > 0)
    .map(([name]) => name);
  const seenItems = new Set(queue);

  while (queue.length) {
    const itemName = queue.shift();
    const dependentRecipes = ingredientRecipeIndex.get(itemName) || [];

    dependentRecipes.forEach((recipe) => {
      if (!relevant.has(recipe.id)) {
        relevant.add(recipe.id);
      }

      if (!seenItems.has(recipe.outputName)) {
        seenItems.add(recipe.outputName);
        queue.push(recipe.outputName);
      }
    });
  }

  return relevant;
}

function craftAsManyAsPossible(recipe, initialStock) {
  let currentStock = cloneStock(initialStock);
  let outputCount = 0;
  let allSteps = [];

  while (true) {
    const crafted = craftRecipe(recipe, currentStock, new Set(), 0);
    if (!crafted) break;

    currentStock = crafted.stock;
    outputCount += recipe.output;
    allSteps = allSteps.concat(crafted.steps);
  }

  if (outputCount === 0) return null;

  return {
    stock: currentStock,
    outputCount,
    steps: allSteps
  };
}

function craftRecipe(recipe, stock, trail, depth) {
  if (depth > 6 || trail.has(recipe.outputName)) return null;

  let currentStock = cloneStock(stock);
  let collectedSteps = [];
  const nextTrail = new Set(trail);
  nextTrail.add(recipe.outputName);

  for (const [ingredientName, ingredientCount] of Object.entries(recipe.ingredients)) {
    const resolved = satisfyNeed(ingredientName, ingredientCount, currentStock, nextTrail, depth + 1);
    if (!resolved) return null;
    currentStock = resolved.stock;
    collectedSteps = collectedSteps.concat(resolved.steps);
  }

  currentStock[recipe.outputName] = (currentStock[recipe.outputName] || 0) + recipe.output;
  collectedSteps.push({
    key: recipe.id,
    recipe,
    runs: 1
  });

  return {
    stock: currentStock,
    steps: collectedSteps
  };
}

function resolveRecipeWithRequirements(recipe, stock, trail, depth) {
  if (depth > 8 || trail.has(recipe.outputName)) {
    return { stock, steps: [], missing: { [recipe.outputName]: 1 } };
  }

  let currentStock = stock;
  let steps = [];
  let missing = {};
  const nextTrail = new Set(trail);
  nextTrail.add(recipe.outputName);

  for (const [ingredientName, ingredientCount] of Object.entries(recipe.ingredients)) {
    const resolved = resolveNeedWithRequirements(ingredientName, ingredientCount, currentStock, nextTrail, depth + 1);
    currentStock = resolved.stock;
    steps = steps.concat(resolved.steps);
    mergeCounts(missing, resolved.missing);
  }

  currentStock[recipe.outputName] = (currentStock[recipe.outputName] || 0) + recipe.output;
  steps.push({
    key: `${recipe.id}:${depth}:${steps.length}`,
    recipe,
    runs: 1
  });

  return { stock: currentStock, steps, missing };
}

function satisfyNeed(itemName, count, stock, trail, depth) {
  const available = stock[itemName] || 0;
  if (available >= count) {
    const nextStock = cloneStock(stock);
    nextStock[itemName] = available - count;
    return {
      stock: nextStock,
      steps: []
    };
  }

  const missing = count - available;
  const producers = (recipeIndex.get(itemName) || []).filter((recipe) => !trail.has(recipe.outputName));
  if (!producers.length) return null;

  let best = null;

  for (const producer of producers.slice(0, producerSearchLimit(itemName))) {
    const runs = Math.ceil(missing / producer.output);
    let currentStock = cloneStock(stock);
    let currentSteps = [];
    let possible = true;

    currentStock[itemName] = 0;

    for (let run = 0; run < runs; run += 1) {
      const crafted = craftRecipe(producer, currentStock, trail, depth + 1);
      if (!crafted) {
        possible = false;
        break;
      }

      currentStock = crafted.stock;
      currentSteps = currentSteps.concat(crafted.steps);
    }

    if (!possible) continue;

    if ((currentStock[itemName] || 0) < missing) continue;

    currentStock[itemName] -= missing;
    const candidate = {
      stock: currentStock,
      steps: currentSteps
    };

    if (!best || candidate.steps.length < best.steps.length) {
      best = candidate;
    }
  }

  return best;
}

function resolveNeedWithRequirements(itemName, count, stock, trail, depth) {
  const available = stock[itemName] || 0;
  if (available >= count) {
    stock[itemName] = available - count;
    return { stock, steps: [], missing: {} };
  }

  const missingCount = count - available;
  stock[itemName] = 0;

  const producers = (recipeIndex.get(itemName) || []).filter((recipe) => !recipe.enchanted && !trail.has(recipe.outputName));
  if (!producers.length) {
    return {
      stock,
      steps: [],
      missing: { [itemName]: missingCount }
    };
  }

  let best = null;

  for (const producer of producers.slice(0, producerSearchLimit(itemName))) {
    let candidateStock = cloneStock(stock);
    let candidateSteps = [];
    let candidateMissing = {};
    const runs = Math.ceil(missingCount / Math.max(1, producer.output || 1));

    for (let run = 0; run < runs; run += 1) {
      const resolved = resolveRecipeWithRequirements(producer, candidateStock, trail, depth + 1);
      candidateStock = resolved.stock;
      candidateSteps = candidateSteps.concat(resolved.steps);
      mergeCounts(candidateMissing, resolved.missing);
    }

    const produced = candidateStock[itemName] || 0;
    if (produced >= missingCount) {
      candidateStock[itemName] = produced - missingCount;
    } else {
      candidateStock[itemName] = 0;
      candidateMissing[itemName] = (candidateMissing[itemName] || 0) + (missingCount - produced);
    }

    const candidate = {
      stock: candidateStock,
      steps: candidateSteps,
      missing: candidateMissing
    };

    if (!best || compareRequirementCandidates(candidate, best) < 0) {
      best = candidate;
    }
  }

  return best || { stock, steps: [], missing: { [itemName]: missingCount } };
}

function isFinalRecipe(recipe) {
  if (recipe.plannerType === "refine") return false;
  if (recipe.enchanted) return false;
  if (isLikelyNonCraftable(recipe.outputName)) return false;
  return !recipe.outputName.includes(" .");
}

function scoreRecipe(recipe) {
  return parseTier(recipe.tier) * 100 + (recipe.priority || 0);
}

function recipePriority(category) {
  switch (category) {
    case "Monturas":
      return 48;
    case "Armas":
      return 45;
    case "Armadura":
      return 43;
    case "Accesorios":
      return 40;
    case "Consumibles":
      return 34;
    case "Otros":
      return 20;
    default:
      return 10;
  }
}

function collectAllTrackableNames(recipeList) {
  const names = new Set([...QUICK_ITEMS.map((item) => item.name), ...FISH_ITEMS]);

  recipeList.forEach((recipe) => {
    names.add(recipe.outputName);
    Object.keys(recipe.ingredients).forEach((name) => names.add(name));
  });

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

function collectSearchableMaterials(recipeList) {
  const names = new Set([...QUICK_ITEMS.map((item) => item.name), ...FISH_ITEMS]);

  recipeList.forEach((recipe) => {
    Object.keys(recipe.ingredients).forEach((name) => {
      if (!isLikelyNonCraftable(name) && looksLikeMaterial(name)) {
        names.add(name);
      }
    });

    if (!isLikelyNonCraftable(recipe.outputName) && recipe.plannerType === "refine" && looksLikeMaterial(recipe.outputName)) {
      names.add(recipe.outputName);
    }
  });

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

function collectSearchableTargets(recipeList) {
  return recipeList
    .filter((recipe) => isSearchableTargetRecipe(recipe))
    .map((recipe) => recipe.outputName)
    .filter((name, index, list) => list.indexOf(name) === index)
    .sort((left, right) => left.localeCompare(right));
}

async function handleScreenshotSelection() {
  const file = screenshotFileInput.files?.[0];
  clearScreenshotImport(false);

  if (!file) {
    setScreenshotStatus("Upload a screenshot, then scan the visible inventory slots.");
    return;
  }

  try {
    screenshotObjectUrl = URL.createObjectURL(file);
    screenshotBitmap = await createImageBitmap(file);
    screenshotPreview.src = screenshotObjectUrl;
    screenshotPreview.hidden = false;
    screenshotPreviewEmpty.hidden = true;
    screenshotScanButton.disabled = false;
    setScreenshotStatus("Screenshot loaded. Drag over the inventory area, then click Scan visible slots.");
  } catch (error) {
    clearScreenshotImport(false);
    setScreenshotStatus(`Could not load screenshot: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function scanScreenshotInventory() {
  if (screenshotRecognitionRunning) return;
  if (!screenshotBitmap) return;
  if (!screenshotSelection) {
    setScreenshotStatus("Draw a rectangle over the inventory area first, then scan.");
    return;
  }
  screenshotRecognitionRunning = true;
  screenshotScanButton.disabled = true;
  screenshotImportButton.disabled = true;
  detectedScreenshotMatches = [];
  renderScreenshotResults();

  try {
    const slotSize = Math.max(48, Number(screenshotSlotSizeInput.value) || 84);
    setScreenshotStatus("Scanning screenshot for visible inventory slots...");
    const slotCandidates = findScreenshotSlotCandidates(slotSize, getNaturalScreenshotSelection());

    if (!slotCandidates.length) {
      setScreenshotStatus("No likely inventory slots found. Try a tighter crop around the inventory or adjust slot size.");
      return;
    }

    setScreenshotStatus(`Found ${slotCandidates.length} likely slot(s). Matching icons and reading quantities...`);
    const aggregateMatches = new Map();

    for (let index = 0; index < slotCandidates.length; index += 1) {
      const slot = slotCandidates[index];
      const slotCanvas = buildSlotCanvasFromBitmap(slot.centerX, slot.centerY, slotSize);
      const [match, amount] = await Promise.all([
        matchSlotToMaterial(slotCanvas),
        readSlotAmount(slotCanvas)
      ]);

      if (!match) continue;

      const current = aggregateMatches.get(match.name);
      if (current) {
        current.amount += amount || 1;
        current.score = Math.min(current.score, match.score);
      } else {
        aggregateMatches.set(match.name, {
          name: match.name,
          amount: amount || 1,
          score: match.score
        });
      }

      if ((index + 1) % 4 === 0 || index === slotCandidates.length - 1) {
        setScreenshotStatus(`Matching icons and quantities... ${index + 1}/${slotCandidates.length}`);
      }
    }

    detectedScreenshotMatches = Array.from(aggregateMatches.values())
      .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));

    renderScreenshotResults();
    screenshotImportButton.disabled = !detectedScreenshotMatches.length;

    if (detectedScreenshotMatches.length) {
      setScreenshotStatus(`Detected ${detectedScreenshotMatches.length} material stack(s). Review and import if it looks right.`);
    } else {
      setScreenshotStatus("The scan did not find confident material matches. Try a tighter crop or a different slot size.");
    }
  } catch (error) {
    setScreenshotStatus(`Screenshot scan failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    screenshotRecognitionRunning = false;
    screenshotScanButton.disabled = !screenshotBitmap;
  }
}

function buildSlotCanvasFromBitmap(centerX, centerY, slotSize) {
  const bitmap = screenshotBitmap;
  const cropSize = Math.max(48, slotSize);
  const left = Math.max(0, Math.round(centerX - cropSize / 2));
  const top = Math.max(0, Math.round(centerY - cropSize / 2));
  const width = Math.min(cropSize, bitmap.width - left);
  const height = Math.min(cropSize, bitmap.height - top);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);
  return canvas;
}

function beginScreenshotSelection(event) {
  if (!screenshotBitmap || screenshotPreview.hidden) return;
  const point = mapPointerToPreview(event.clientX, event.clientY);
  if (!point) return;
  screenshotDragState = { startX: point.x, startY: point.y, currentX: point.x, currentY: point.y };
  updateScreenshotSelectionBox();
}

function updateScreenshotSelection(event) {
  if (!screenshotDragState) return;
  const point = mapPointerToPreview(event.clientX, event.clientY);
  if (!point) return;
  screenshotDragState.currentX = point.x;
  screenshotDragState.currentY = point.y;
  updateScreenshotSelectionBox();
}

function finishScreenshotSelection() {
  if (!screenshotDragState) return;
  const selection = normalizeSelectionRect(
    screenshotDragState.startX,
    screenshotDragState.startY,
    screenshotDragState.currentX,
    screenshotDragState.currentY
  );
  screenshotDragState = null;

  if (selection.width < 28 || selection.height < 28) {
    screenshotSelection = null;
    updateScreenshotSelectionBox();
    setScreenshotStatus("Selection too small. Drag a larger rectangle around the inventory area.");
    return;
  }

  screenshotSelection = selection;
  updateScreenshotSelectionBox();
  setScreenshotStatus("Inventory area selected. Click Scan visible slots to detect resources inside that region.");
}

function mapPointerToPreview(clientX, clientY) {
  const rect = screenshotPreview.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
  return { x, y };
}

function normalizeSelectionRect(startX, startY, endX, endY) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };
}

function updateScreenshotSelectionBox() {
  const activeRect = screenshotDragState
    ? normalizeSelectionRect(
        screenshotDragState.startX,
        screenshotDragState.startY,
        screenshotDragState.currentX,
        screenshotDragState.currentY
      )
    : screenshotSelection;

  if (!activeRect) {
    screenshotSelectionBox.hidden = true;
    return;
  }

  const previewRect = screenshotPreview.getBoundingClientRect();
  const shellRect = screenshotPreviewShell.getBoundingClientRect();
  const left = screenshotPreview.offsetLeft + activeRect.x;
  const top = screenshotPreview.offsetTop + activeRect.y;

  screenshotSelectionBox.hidden = false;
  screenshotSelectionBox.style.left = `${left}px`;
  screenshotSelectionBox.style.top = `${top}px`;
  screenshotSelectionBox.style.width = `${activeRect.width}px`;
  screenshotSelectionBox.style.height = `${activeRect.height}px`;
  screenshotSelectionBox.style.maxWidth = `${Math.max(0, previewRect.width - (left - screenshotPreview.offsetLeft))}px`;
  screenshotSelectionBox.style.maxHeight = `${Math.max(0, shellRect.height - (top - screenshotPreview.offsetTop))}px`;
}

function getNaturalScreenshotSelection() {
  if (!screenshotSelection) return null;
  const previewRect = screenshotPreview.getBoundingClientRect();
  const ratioX = screenshotPreview.naturalWidth / Math.max(1, previewRect.width);
  const ratioY = screenshotPreview.naturalHeight / Math.max(1, previewRect.height);

  return {
    x: Math.round(screenshotSelection.x * ratioX),
    y: Math.round(screenshotSelection.y * ratioY),
    width: Math.round(screenshotSelection.width * ratioX),
    height: Math.round(screenshotSelection.height * ratioY)
  };
}

function findScreenshotSlotCandidates(slotSize, bounds) {
  if (!screenshotBitmap) return [];

  const step = Math.max(10, Math.round(slotSize / 5));
  const margin = Math.round(slotSize / 2);
  const candidates = [];
  const startX = Math.max(margin, bounds ? bounds.x + margin : margin);
  const startY = Math.max(margin, bounds ? bounds.y + margin : margin);
  const endX = Math.min(
    screenshotBitmap.width - margin,
    bounds ? bounds.x + bounds.width - margin : screenshotBitmap.width - margin
  );
  const endY = Math.min(
    screenshotBitmap.height - margin,
    bounds ? bounds.y + bounds.height - margin : screenshotBitmap.height - margin
  );

  for (let centerY = startY; centerY <= endY; centerY += step) {
    for (let centerX = startX; centerX <= endX; centerX += step) {
      const score = scoreSlotCandidate(centerX, centerY, slotSize);
      if (score < 0.46) continue;
      candidates.push({ centerX, centerY, score });
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  const accepted = [];
  const minDistance = Math.round(slotSize * 0.72);

  for (const candidate of candidates) {
  if (accepted.length >= 36) break;
    const overlaps = accepted.some((entry) => {
      const dx = entry.centerX - candidate.centerX;
      const dy = entry.centerY - candidate.centerY;
      return Math.hypot(dx, dy) < minDistance;
    });
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((left, right) => left.centerY - right.centerY || left.centerX - right.centerX);
}

function scoreSlotCandidate(centerX, centerY, slotSize) {
  const canvas = buildSlotCanvasFromBitmap(centerX, centerY, slotSize);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const width = canvas.width;
  const height = canvas.height;

  let borderDark = 0;
  let borderCount = 0;
  let centerVariance = 0;
  let centerCount = 0;
  let amountContrast = 0;
  let amountCount = 0;
  let centerSum = 0;
  let centerSquares = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const gray = imageData[index] * 0.299 + imageData[index + 1] * 0.587 + imageData[index + 2] * 0.114;
      const borderBand = Math.max(4, Math.round(slotSize * 0.08));
      const isBorder = x < borderBand || y < borderBand || x >= width - borderBand || y >= height - borderBand;

      if (isBorder) {
        borderCount += 1;
        if (gray < 105) borderDark += 1;
        continue;
      }

      const centerLeft = Math.round(width * 0.18);
      const centerRight = Math.round(width * 0.82);
      const centerTop = Math.round(height * 0.1);
      const centerBottom = Math.round(height * 0.8);
      const isCenter = x >= centerLeft && x <= centerRight && y >= centerTop && y <= centerBottom;
      if (isCenter) {
        centerCount += 1;
        centerSum += gray;
        centerSquares += gray * gray;
      }

      const amountArea = x >= Math.round(width * 0.56) && y >= Math.round(height * 0.64);
      if (amountArea) {
        amountCount += 1;
        if (gray > 170 || gray < 70) amountContrast += 1;
      }
    }
  }

  if (!borderCount || !centerCount || !amountCount) return 0;

  const borderScore = borderDark / borderCount;
  const mean = centerSum / centerCount;
  const variance = Math.max(0, centerSquares / centerCount - mean * mean);
  const normalizedVariance = Math.min(1, variance / 2200);
  const amountScore = amountContrast / amountCount;

  return borderScore * 0.45 + normalizedVariance * 0.35 + amountScore * 0.2;
}

async function matchSlotToMaterial(slotCanvas) {
  const slotDescriptor = buildImageDescriptor(extractIconArea(slotCanvas));
  let best = null;

  for (const candidate of screenshotMaterialCandidates) {
    const iconDescriptor = await getIconDescriptor(candidate.iconId);
    if (!iconDescriptor) continue;

    const score = compareImageDescriptors(slotDescriptor, iconDescriptor);
    if (!best || score < best.score) {
      best = { name: candidate.name, score };
    }
  }

  return best && best.score < 52 ? best : null;
}

function extractIconArea(slotCanvas) {
  const size = Math.min(slotCanvas.width, slotCanvas.height);
  const iconSize = Math.round(size * 0.74);
  const left = Math.round((slotCanvas.width - iconSize) / 2);
  const top = Math.round(size * 0.06);
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(slotCanvas, left, top, iconSize, iconSize, 0, 0, iconSize, iconSize);
  return canvas;
}

async function getIconDescriptor(iconId) {
  if (iconDescriptorCache.has(iconId)) {
    return iconDescriptorCache.get(iconId);
  }

  try {
    const response = await fetch(buildIconUrl(iconId), { mode: "cors" });
    if (!response.ok) {
      iconDescriptorCache.set(iconId, null);
      return null;
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const descriptor = buildImageDescriptor(canvas);
    iconDescriptorCache.set(iconId, descriptor);
    return descriptor;
  } catch {
    iconDescriptorCache.set(iconId, null);
    return null;
  }
}

function buildImageDescriptor(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = 20;
  canvas.height = 20;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const values = [];

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    const gray = (data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114) * alpha;
    values.push(gray);
  }

  return values;
}

function compareImageDescriptors(left, right) {
  if (!left || !right || left.length !== right.length) return Number.POSITIVE_INFINITY;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff += Math.abs(left[index] - right[index]);
  }

  return diff / left.length;
}

async function readSlotAmount(slotCanvas) {
  if (!window.Tesseract) return 1;

  const cropWidth = Math.round(slotCanvas.width * 0.48);
  const cropHeight = Math.round(slotCanvas.height * 0.34);
  const cropX = slotCanvas.width - cropWidth;
  const cropY = slotCanvas.height - cropHeight;
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(slotCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const imageData = context.getImageData(0, 0, cropWidth, cropHeight);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const gray = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
    const value = gray > 140 ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);

  const result = await window.Tesseract.recognize(canvas, "eng", {
    tessedit_char_whitelist: "0123456789"
  });
  const match = String(result.data?.text || "").match(/\d{1,5}/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

function renderScreenshotResults() {
  screenshotResults.innerHTML = "";

  if (!detectedScreenshotMatches.length) {
    screenshotResults.innerHTML = `<p class="helper-text">No screenshot matches ready yet.</p>`;
    return;
  }

  detectedScreenshotMatches.forEach((entry) => {
    const node = document.createElement("article");
    node.className = "ocr-result";
    node.innerHTML = `
      <div class="ocr-result__main">
        <span class="item-avatar">
          <img class="item-avatar__img" alt="" loading="lazy">
          <span class="item-avatar__fallback"></span>
        </span>
        <div>
          <h3 class="ocr-result__name"></h3>
          <p class="ocr-result__meta"></p>
        </div>
      </div>
      <span class="ocr-result__amount"></span>
    `;

    node.querySelector(".ocr-result__name").textContent = entry.name;
    node.querySelector(".ocr-result__meta").textContent = `Icon match score: ${entry.score.toFixed(1)}. Click more slots to add more materials.`;
    node.querySelector(".ocr-result__amount").textContent = `x${entry.amount}`;
    hydrateIcon(node.querySelector(".item-avatar"), entry.name);
    screenshotResults.appendChild(node);
  });
}

function importDetectedScreenshotMaterials() {
  if (!detectedScreenshotMatches.length) return;

  detectedScreenshotMatches.forEach((entry) => {
    inventory[entry.name] = Math.max(0, Number(entry.amount) || 0);
  });

  saveInventory();
  renderInventory();
  scheduleMaterialPickerRefresh(true);
  markPlannerDirty();
  setScreenshotStatus(`Imported ${detectedScreenshotMatches.length} detected material(s) into your inventory.`);
}

function clearScreenshotImport(resetInput = true) {
  if (screenshotObjectUrl) {
    URL.revokeObjectURL(screenshotObjectUrl);
    screenshotObjectUrl = "";
  }
  if (screenshotBitmap) {
    screenshotBitmap.close();
    screenshotBitmap = null;
  }

  detectedScreenshotMatches = [];
  screenshotSelection = null;
  screenshotDragState = null;
  renderScreenshotResults();
  screenshotPreview.hidden = true;
  screenshotPreview.removeAttribute("src");
  screenshotPreviewEmpty.hidden = false;
  screenshotSelectionBox.hidden = true;
  screenshotScanButton.disabled = true;
  screenshotImportButton.disabled = true;

  if (resetInput && screenshotFileInput) {
    screenshotFileInput.value = "";
  }

  setScreenshotStatus("Upload a screenshot, drag over the inventory area, then scan the visible slots.");
}

function setScreenshotStatus(message) {
  screenshotStatus.textContent = message;
}

function isSearchableTargetRecipe(recipe) {
  if (!recipe || recipe.plannerType !== "craft") return false;
  if (recipe.enchanted) return false;
  if (isLikelyNonCraftable(recipe.outputName)) return false;
  if (recipe.outputName.includes(" .")) return false;
  if (EXTRA_SEARCHABLE_TARGETS.has(recipe.outputName)) return true;
  return true;
}

function looksLikeMaterial(name) {
  const value = String(name || "").trim();
  if (!value) return false;
  if (/["]/.test(value)) return false;

  const blockedKeywords = [
    "Adept's",
    "Expert's",
    "Master's",
    "Grandmaster's",
    "Elder's",
    "Novice's",
    "Journeyman's",
    "Bag",
    "Cape",
    "Shoes",
    "Boots",
    "Armor",
    "Armour",
    "Robe",
    "Jacket",
    "Helmet",
    "Hood",
    "Cowl",
    "Mace",
    "Sword",
    "Axe",
    "Bow",
    "Crossbow",
    "Dagger",
    "Hammer",
    "Staff",
    "Spear",
    "Gloves",
    "Sandals",
    "Potion",
    "Omelette",
    "Stew",
    "Soup",
    "Salad",
    "Pie",
    "Mount"
  ];

  if (blockedKeywords.some((keyword) => value.includes(keyword))) {
    return false;
  }

  const materialKeywords = [
    "Ore",
    "Bar",
    "Logs",
    "Planks",
    "Cotton",
    "Flax",
    "Hemp",
    "Cloth",
    "Hide",
    "Leather",
    "Stone",
    "Block",
    "Sigil",
    "Artifact",
    "Rune",
    "Soul",
    "Relic",
    "Heart",
    "Feathers",
    "Folds",
    "Head",
    "Axeheads",
    "Memoir",
    "Belt",
    "Amulet",
    "Fiber",
    "Metal",
    "Wood",
    "Fish",
    "Trout",
    "Snapper",
    "Eel",
    "Pike",
    "Sturgeon",
    "Catfish",
    "Kraken",
    "Seaweed",
    "Flour",
    "Milk",
    "Egg",
    "Butter",
    "Bean",
    "Goose",
    "Pork",
    "Chicken",
    "Mutton",
    "Carrot",
    "Turnip",
    "Cabbage",
    "Wheat"
  ];

  return materialKeywords.some((keyword) => value.includes(keyword));
}

function ensureMaterials(names) {
  names.forEach((name) => {
    if (!(name in inventory)) {
      inventory[name] = 0;
    }
  });
}

function loadInventory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function loadRouteSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(routeSettingsKey) || "{}");
    return {
      startingCity: parsed.startingCity || "Caerleon"
    };
  } catch {
    return {
      startingCity: "Caerleon"
    };
  }
}

function saveInventory() {
  localStorage.setItem(storageKey, JSON.stringify(inventory));
}

function saveRouteSettings() {
  localStorage.setItem(routeSettingsKey, JSON.stringify(routeSettings));
}

function applyRouteSettingsToControls() {
  startingCitySelect.value = routeSettings.startingCity;
}

function parseTier(tierString) {
  return Number(String(tierString).split(".")[0]) || 0;
}

function buildTieredId(tier, suffix) {
  return `T${tier}_${suffix}`;
}

function buildIconUrl(iconId) {
  return `https://render.albiononline.com/v1/item/${iconId}.png?size=96`;
}

function hydrateIcon(container, name, iconId = itemIconMap.get(name)) {
  if (!container) return;

  const image = container.querySelector(".item-avatar__img");
  const fallback = container.querySelector(".item-avatar__fallback");
  fallback.textContent = "";
  const resolvedIconId = iconId || itemIconMap.get(normalizeIconLookupName(name));

  if (!resolvedIconId) {
    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
    return;
  }

  image.src = buildIconUrl(resolvedIconId);
  image.hidden = false;
  fallback.hidden = true;
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
}

function calculateRefiningSavings(stepEntries) {
  const savings = {};
  stepEntries.forEach((entry) => {
    if (entry.recipe.plannerType !== "refine") return;
    const bestCity = getBestRefiningCityForRecipe(entry.recipe);
    if (!bestCity) return;

    Object.entries(entry.recipe.ingredients).forEach(([name, amount]) => {
      if (!savings[name]) {
        savings[name] = { amount: 0, city: bestCity };
      }
      savings[name].amount += amount * entry.runs * REFINING_CITY_RETURN_RATE;
    });
  });

  return Object.entries(savings)
    .filter(([, entry]) => entry.amount > 0)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function getBestRefiningCityForRecipe(recipe) {
  const family = getRefiningFamilyForRecipe(recipe);
  if (!family) return "";

  return Object.entries(REFINING_CITY_BONUSES).find(([, bonusFamily]) => bonusFamily === family)?.[0] || "";
}

function getRefiningFamilyForRecipe(recipe) {
  if (!recipe || recipe.plannerType !== "refine") return "";

  const outputName = recipe.outputName || "";
  const line = RESOURCE_LINES.find((entry) => entry.refinedNames.includes(outputName));
  return line ? line.family : "";
}

function formatEstimatedAmount(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getPrimaryRecipeForName(name) {
  return (recipeIndex.get(name) || []).find((recipe) => !recipe.enchanted) || null;
}

function producerSearchLimit(itemName) {
  return itemName === "Chopped Fish" ? 24 : 4;
}

function buildPlanDetails(stepEntries, resourceList, resourceTitle, emptyResourceText, consumedMap = {}) {
  const wrapper = document.createElement("section");
  wrapper.className = "target-plan-details";
  const savingsList = calculateRefiningSavings(stepEntries);
  const travelAdvice = buildTravelAdvice(stepEntries, consumedMap);

  const stepsSection = document.createElement("section");
  stepsSection.className = "target-plan-section";
  stepsSection.innerHTML = `<h3 class="target-plan-section__title">Step by step</h3>`;

  if (stepEntries.length) {
    const list = document.createElement("div");
    list.className = "target-step-list";
    stepEntries.forEach((entry) => {
      list.appendChild(buildStepCard(entry));
    });
    stepsSection.appendChild(list);
  } else {
    stepsSection.innerHTML += `<p class="helper-text">No crafting steps were generated for this target.</p>`;
  }

  wrapper.appendChild(stepsSection);

  const missingSection = document.createElement("section");
  missingSection.className = "target-plan-section";
  missingSection.innerHTML = `<h3 class="target-plan-section__title">${resourceTitle}</h3>`;

  if (resourceList.length) {
    const grid = document.createElement("div");
    grid.className = "missing-grid";
    resourceList.forEach(([name, amount]) => {
      grid.appendChild(buildMissingItem(name, amount));
    });
    missingSection.appendChild(grid);
  } else {
    missingSection.innerHTML += `<p class="helper-text">${emptyResourceText}</p>`;
  }

  wrapper.appendChild(missingSection);

  if (savingsList.length) {
    const savingsSection = document.createElement("section");
    savingsSection.className = "target-plan-section";
    savingsSection.innerHTML = `<h3 class="target-plan-section__title">Estimated best city savings</h3>`;

    const grid = document.createElement("div");
    grid.className = "missing-grid";
    savingsList.forEach(([name, entry]) => {
      grid.appendChild(
        buildMissingItem(name, entry.amount, `Estimated return: x${formatEstimatedAmount(entry.amount)} in ${entry.city}`)
      );
    });
    savingsSection.appendChild(grid);
    wrapper.appendChild(savingsSection);
  }

  if (travelAdvice.length) {
    const travelSection = document.createElement("section");
    travelSection.className = "target-plan-section";
    travelSection.innerHTML = `<h3 class="target-plan-section__title">Travel advice</h3>`;

    const list = document.createElement("div");
    list.className = "target-step-list";
    travelAdvice.forEach((entry) => {
      list.appendChild(buildTravelCard(entry));
    });
    travelSection.appendChild(list);
    wrapper.appendChild(travelSection);
  }

  return wrapper;
}

function buildStepCard(entry) {
  const template = document.querySelector("#step-card-template");
  const node = template.content.firstElementChild.cloneNode(true);
  const actionLabel = entry.recipe.plannerType === "refine" ? "Refine" : "Craft";
  const outputAmount = entry.recipe.output * entry.runs;
  const ingredientText = Object.entries(entry.recipe.ingredients)
    .map(([name, amount]) => `${name} x${amount * entry.runs}`)
    .join(", ");

  node.querySelector(".step-card__eyebrow").textContent = `${actionLabel} at ${entry.recipe.craftedAt || "the right station"}`;
  node.querySelector(".step-card__name").textContent = entry.recipe.outputName;
  node.querySelector(".step-card__meta").textContent = ingredientText
    ? `Use ${ingredientText}.`
    : "No ingredients listed.";
  if (entry.recipe.plannerType === "refine") {
    const bonusCity = getBestRefiningCityForRecipe(entry.recipe);
    if (bonusCity) {
      node.querySelector(".step-card__meta").textContent += ` Best refining city: ${bonusCity}.`;
    }
  }
  node.querySelector(".step-card__amount").textContent = `x${outputAmount}`;

  hydrateIcon(node.querySelector(".item-avatar"), entry.recipe.outputName, entry.recipe.outputId);
  return node;
}

function buildMissingItem(name, amount, metaText = `Still needed: x${formatEstimatedAmount(amount)}`) {
  const template = document.querySelector("#missing-item-template");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector(".missing-item__name").textContent = name;
  node.querySelector(".missing-item__meta").textContent = metaText;
  hydrateIcon(node.querySelector(".item-avatar"), name);
  return node;
}

function buildTravelAdvice(stepEntries, consumedMap = {}) {
  const spareInventory = subtractInventory(inventory, consumedMap);
  let previousCity = routeSettings.startingCity || "Caerleon";
  const optimizedStops = optimizeTravelStops(buildTravelStops(stepEntries), routeSettings.startingCity);

  return optimizedStops.map((group, index) => {
    const outputName = group.refineOutputs[0] || group.craftOutputs[0] || group.destination;
    const outputId = itemIconMap.get(outputName) || "";
    const tasks = [];
    const extraRefines = collectExtraRefiningSuggestions(group.destination, spareInventory);
    const travelPath = previousCity === group.destination ? [group.destination] : findShortestCityPath(previousCity, group.destination);
    const travelHops = Math.max(0, travelPath.length - 1);

    if (group.refineOutputs.length) {
      tasks.push(`refine ${group.refineOutputs.join(", ")}`);
    }
    if (group.craftOutputs.length) {
      const stationText = group.craftStations.length ? ` at ${group.craftStations.join(" / ")}` : "";
      tasks.push(`craft ${group.craftOutputs.join(", ")}${stationText}`);
    }

    previousCity = group.destination;
    return {
      destination: group.destination,
      outputName,
      outputId,
      eyebrow: buildTravelEyebrow(group.destination, travelPath, index === 0),
      amountLabel: travelHops ? `${travelHops} hop${travelHops === 1 ? "" : "s"}` : "Here",
      message: buildTravelMessage(group.destination, tasks, extraRefines, index === 0, travelPath)
    };
  });
}

function buildTravelStops(stepEntries) {
  const stops = [];
  let currentCity = routeSettings.startingCity || "Caerleon";

  stepEntries.forEach((entry) => {
    const destination = entry.recipe.plannerType === "refine" ? getBestRefiningCityForRecipe(entry.recipe) : currentCity;
    if (!destination) return;

    if (entry.recipe.plannerType === "refine") {
      currentCity = destination;
    }

    const previousStop = stops[stops.length - 1];
    const activeStop = previousStop && previousStop.destination === destination
      ? previousStop
      : createTravelStop(destination);

    if (activeStop !== previousStop) {
      stops.push(activeStop);
    }

    appendTravelTask(activeStop, entry);
  });

  return stops;
}

function optimizeTravelStops(stops, startingCity) {
  if (stops.length <= 1) return stops;
  const optimized = [];
  let current = KNOWN_CITIES.has(startingCity) ? startingCity : "Caerleon";
  let index = 0;

  while (index < stops.length) {
    if (stops[index].craftOutputs.length) {
      optimized.push(stops[index]);
      current = stops[index].destination;
      index += 1;
      continue;
    }

    let segmentEnd = index;
    while (segmentEnd < stops.length && !stops[segmentEnd].craftOutputs.length) {
      segmentEnd += 1;
    }

    const segment = mergeTravelStopsByDestination(stops.slice(index, segmentEnd));
    const nextAnchorCity = segmentEnd < stops.length ? stops[segmentEnd].destination : "";
    const optimizedSegment = optimizeRefineSegment(segment, current, nextAnchorCity);

    optimized.push(...optimizedSegment);
    if (optimizedSegment.length) {
      current = optimizedSegment[optimizedSegment.length - 1].destination;
    }

    index = segmentEnd;
  }

  return optimized;
}

function mergeTravelStopsByDestination(stops) {
  const merged = new Map();
  const order = [];

  stops.forEach((stop) => {
    if (!merged.has(stop.destination)) {
      merged.set(stop.destination, createTravelStop(stop.destination));
      order.push(stop.destination);
    }

    const target = merged.get(stop.destination);
    stop.refineOutputs.forEach((name) => {
      if (!target.refineOutputs.includes(name)) {
        target.refineOutputs.push(name);
      }
    });
  });

  return order.map((destination) => merged.get(destination));
}

function optimizeRefineSegment(stops, startCity, endCity = "") {
  if (stops.length <= 1) return stops;
  if (stops.length > 7) {
    return optimizeRefineSegmentGreedy(stops, startCity, endCity);
  }

  let bestRoute = stops;
  let bestCost = Number.POSITIVE_INFINITY;
  const used = new Array(stops.length).fill(false);
  const route = [];

  const dfs = (currentCity, costSoFar) => {
    if (route.length === stops.length) {
      const tailCost = endCity ? getCityDistance(currentCity, endCity) : 0;
      const totalCost = costSoFar + tailCost;
      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestRoute = route.map((stop) => stop);
      }
      return;
    }

    if (costSoFar >= bestCost) return;

    for (let index = 0; index < stops.length; index += 1) {
      if (used[index]) continue;
      const stop = stops[index];
      used[index] = true;
      route.push(stop);
      dfs(stop.destination, costSoFar + getCityDistance(currentCity, stop.destination));
      route.pop();
      used[index] = false;
    }
  };

  dfs(startCity, 0);
  return bestRoute;
}

function optimizeRefineSegmentGreedy(stops, startCity, endCity = "") {
  const remaining = [...stops];
  const optimized = [];
  let current = startCity;

  while (remaining.length) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    remaining.forEach((stop, index) => {
      const hereCost = getCityDistance(current, stop.destination);
      const tailCost = endCity ? getCityDistance(stop.destination, endCity) : 0;
      const score = hereCost * 10 + tailCost;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [nextStop] = remaining.splice(bestIndex, 1);
    optimized.push(nextStop);
    current = nextStop.destination;
  }

  return optimized;
}

function getCityDistance(start, end) {
  const path = findShortestCityPath(start, end);
  return path.length ? path.length - 1 : Number.POSITIVE_INFINITY;
}

function createTravelStop(destination) {
  return {
    destination,
    refineOutputs: [],
    craftOutputs: [],
    craftStations: []
  };
}

function appendTravelTask(stop, entry) {
  if (entry.recipe.plannerType === "refine") {
    if (!stop.refineOutputs.includes(entry.recipe.outputName)) {
      stop.refineOutputs.push(entry.recipe.outputName);
    }
    return;
  }

  if (!stop.craftOutputs.includes(entry.recipe.outputName)) {
    stop.craftOutputs.push(entry.recipe.outputName);
  }

  const stationName = entry.recipe.craftedAt || "Crafting station";
  if (!stop.craftStations.includes(stationName)) {
    stop.craftStations.push(stationName);
  }
}

function buildTravelEyebrow(destination, travelPath, isFirstStop = false) {
  if (isFirstStop) {
    return `Start in ${destination}`;
  }
  if (travelPath.length > 1) {
    const viaCities = travelPath.slice(1, -1);
    if (viaCities.length) {
      return `Go to ${destination} via ${viaCities.join(" -> ")}`;
    }
    return `Go to ${destination}`;
  }
  return `Stay in ${destination}`;
}

function buildTravelMessage(destination, tasks, extraRefines, isFirstStop = false, travelPath = [destination]) {
  const viaCities = travelPath.slice(1, -1);
  const movementText = travelPath.length > 1
    ? `${isFirstStop ? `Leave ${travelPath[0]}` : "Then go"} to ${destination}${viaCities.length ? ` via ${viaCities.join(" -> ")}` : ""}`
    : `${isFirstStop ? `Start in ${destination}` : `Stay in ${destination}`}`;
  const base = `${movementText} to ${tasks.join(" and ")}.`;
  if (!extraRefines.length) return base;

  return `${base} While you are there, you could also refine spare ${extraRefines.join(", ")}.`;
}

function findShortestCityPath(start, end) {
  if (!KNOWN_CITIES.has(start) || !KNOWN_CITIES.has(end)) return end ? [end] : [];
  if (start === end) return [start];

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];

    for (const neighbor of CITY_GRAPH[current] || []) {
      if (visited.has(neighbor)) continue;
      const nextPath = [...path, neighbor];
      if (neighbor === end) {
        return nextPath;
      }
      visited.add(neighbor);
      queue.push(nextPath);
    }
  }

  return [end];
}

function collectExtraRefiningSuggestions(destination, spareInventory) {
  const bonusFamily = REFINING_CITY_BONUSES[destination];
  if (!bonusFamily) return [];

  const line = RESOURCE_LINES.find((entry) => entry.family === bonusFamily);
  if (!line) return [];

  const candidates = [...line.rawNames, ...line.refinedNames]
    .filter((name) => (spareInventory[name] || 0) > 0)
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 3)
    .map((name) => `${name} x${formatEstimatedAmount(spareInventory[name])}`);

  return candidates;
}

function subtractInventory(source, consumedMap) {
  const result = {};

  Object.keys(source || {}).forEach((name) => {
    const remaining = (source[name] || 0) - (consumedMap[name] || 0);
    if (remaining > 0) {
      result[name] = remaining;
    }
  });

  return result;
}

function buildTravelCard(entry) {
  const template = document.querySelector("#step-card-template");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector(".step-card__eyebrow").textContent = entry.eyebrow;
  node.querySelector(".step-card__name").textContent = entry.outputName;
  node.querySelector(".step-card__meta").textContent = entry.message;
  node.querySelector(".step-card__amount").textContent = entry.amountLabel;

  hydrateIcon(node.querySelector(".item-avatar"), entry.outputName, entry.outputId);
  return node;
}

function toNamedAmountList(values) {
  return Object.entries(values || {})
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function summarizeConsumed(consumed) {
  const entries = Object.entries(consumed)
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, amount]) => `${name} x${amount}`);

  return entries.length ? entries.join(", ") : "no consumption";
}

function collectConsumed(before, after) {
  const consumed = {};

  Object.keys(before).forEach((name) => {
    const delta = (before[name] || 0) - (after[name] || 0);
    if (delta > 0) consumed[name] = delta;
  });

  return consumed;
}

function describeStep(recipe, runs) {
  const prefix = recipe.plannerType === "refine" ? "Refine" : "Craft";
  const quantity = recipe.output * runs;
  const ingredients = Object.entries(recipe.ingredients)
    .map(([name, amount]) => `${name} x${amount * runs}`)
    .join(", ");

  return `${prefix} ${recipe.outputName} x${quantity} at ${recipe.craftedAt || "the right station"} using ${ingredients}.`;
}

function collapseSteps(steps) {
  const collapsed = [];

  steps.forEach((step) => {
    if (collapsed[collapsed.length - 1] === step) {
      return;
    }

    collapsed.push(step);
  });

  return collapsed;
}

function summarizeSteps(stepObjects) {
  return aggregateStepObjects(stepObjects).map((entry) => describeStep(entry.recipe, entry.runs));
}

function aggregateStepObjects(stepObjects) {
  const aggregated = new Map();
  const order = [];

  stepObjects.forEach((entry) => {
    if (!aggregated.has(entry.key)) {
      aggregated.set(entry.key, {
        recipe: entry.recipe,
        runs: 0
      });
      order.push(entry.key);
    }

    aggregated.get(entry.key).runs += entry.runs;
  });

  return order.map((key) => aggregated.get(key));
}

function compareRequirementCandidates(left, right) {
  const leftMissing = totalCount(left.missing);
  const rightMissing = totalCount(right.missing);
  if (leftMissing !== rightMissing) return leftMissing - rightMissing;
  return left.steps.length - right.steps.length;
}

function totalCount(counts) {
  return Object.values(counts || {}).reduce((sum, value) => sum + value, 0);
}

function mergeCounts(target, source) {
  Object.entries(source || {}).forEach(([name, amount]) => {
    target[name] = (target[name] || 0) + amount;
  });
}

function cloneStock(stock) {
  return Object.fromEntries(Object.entries(stock).map(([name, amount]) => [name, amount]));
}

function buildInventoryKey(stock) {
  return Object.entries(stock)
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, amount]) => `${name}:${amount}`)
    .join("|");
}

function updateTrackedCount() {
  trackedCount.textContent = `${Object.values(inventory).filter((amount) => amount > 0).length} materials`;
}

function updateInventoryCard(material) {
  const input = inventoryList.querySelector(`input[data-material="${material.replace(/"/g, '\\"')}"]`);
  if (!input) return;

  const card = input.closest(".inventory-current-item");
  if (!card) return;

  const meta = card.querySelector(".inventory-current-item__meta");
  if (meta) {
    meta.textContent = `Current amount: ${inventory[material] || 0}`;
  }
}

function translateCategory(category) {
  switch (category) {
    case ALL_CATEGORIES:
      return "All";
    case "Armas":
      return "Weapons";
    case "Armadura":
      return "Armor";
    case "Accesorios":
      return "Accessories";
    case "Consumibles":
      return "Consumables";
    case "Monturas":
      return "Mounts";
    case "Otros":
      return "Other";
    case "Refinado":
    case "Refining":
      return "Refining";
    default:
      return category;
  }
}

function setStatus(message) {
  statusText.textContent = message;
}

function setPlannerRunning(running, message = "") {
  plannerRunning = running;
  statusSpinner.hidden = !running;
  analyzeButton.disabled = running;
  analyzeButton.classList.toggle("is-busy", running);
  analyzeButton.textContent = running ? "Analyzing..." : "Analyze Recipes";

  if (message) {
    setStatus(message);
  }
}

function setTargetPlannerRunning(running) {
  targetPlannerRunning = running;
  analyzeTargetButton.disabled = running || !selectedTargetName;
  analyzeTargetButton.classList.toggle("is-busy", running);
  analyzeTargetButton.textContent = running ? "Analyzing..." : "Analyze Target";
}

function initializePlannerWorker(recipeList) {
  if (typeof Worker === "undefined") return;

  if (plannerWorker) {
    plannerWorker.terminate();
  }

  try {
    plannerWorker = new Worker("planner-worker.js");
    plannerWorker.addEventListener("message", handleWorkerMessage);
    postWorkerRequest("init", { recipes: recipeList }).catch(() => {
      plannerWorker = null;
    });
  } catch {
    plannerWorker = null;
  }
}

function handleWorkerMessage(event) {
  const { type, requestId, payload } = event.data || {};
  const pending = workerRequests.get(requestId);
  if (!pending) return;

  if (type.endsWith(":partial")) {
    if (typeof pending.onPartial === "function") {
      pending.onPartial(payload);
    }
    return;
  }

  if (type.endsWith(":error")) {
    pending.reject(new Error(payload?.message || "Worker analysis failed."));
  } else {
    pending.resolve(payload);
  }

  workerRequests.delete(requestId);
}

function postWorkerRequest(type, payload, onPartial = null) {
  if (!plannerWorker) {
    return Promise.reject(new Error("Planner worker is not available."));
  }

  return new Promise((resolve, reject) => {
    const requestId = `${type}:${workerRequestCounter += 1}`;
    workerRequests.set(requestId, { resolve, reject, onPartial });
    plannerWorker.postMessage({ type, requestId, payload });
  });
}

async function analyzeInventoryWithWorker(sourceInventory, inventoryKey) {
  if (!plannerWorker) {
    return buildReachablePlans(sourceInventory);
  }

  const plans = await postWorkerRequest(
    "analyzeInventory",
    {
      inventory: sourceInventory,
      inventoryKey
    },
    (partialPlans) => {
      if (buildInventoryKey(inventory) !== inventoryKey) return;
      plannerCache = normalizeWorkerPlans(partialPlans);
      plannerInventoryKey = inventoryKey;
      plannerDirty = false;
      setStatus(`Analyzing... first ${plannerCache.length} reachable option(s) ready.`);
      renderPlanner(false);
    }
  );

  return normalizeWorkerPlans(plans);
}

function normalizeWorkerPlans(plans) {
  return plans.map((plan) => ({
    recipe: plan.recipe,
    outputCount: plan.outputCount,
    steps: plan.stepEntries.map((entry) => describeStep(entry.recipe, entry.runs)),
    consumed: plan.consumed,
    detailData: {
      stepEntries: plan.stepEntries,
      resourceList: plan.resourceList,
      resourceTitle: plan.resourceTitle,
      emptyResourceText: plan.emptyResourceText
    }
  }));
}

async function analyzeTargetWithWorker(targetName, desiredAmount, sourceInventory) {
  if (!plannerWorker) {
    const recipe = getPrimaryRecipeForName(targetName);
    if (!recipe) return { found: false };

    const result = planTargetRequirements(recipe, desiredAmount, sourceInventory);
    return {
      found: true,
      recipe,
      outputCount: desiredAmount,
      consumed: collectConsumed(sourceInventory, result.stock),
      stepEntries: aggregateStepObjects(result.steps),
      resourceList: toNamedAmountList(result.missing),
      resourceTitle: "Missing resources",
      emptyResourceText: "You already have all the required resources in your inventory."
    };
  }

  return postWorkerRequest("analyzeTarget", {
    targetName,
    desiredAmount,
    inventory: sourceInventory,
    inventoryKey: buildInventoryKey(sourceInventory)
  });
}
