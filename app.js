const storageKey = "albion-crafteo-inventory-v3";
const ALL_CATEGORIES = "__ALL__";
const MATERIAL_NAME_ALIASES = {
  "Baroque Cloth": "Exquisite Cloth",
  "Cured Leather": "Worked Leather"
};

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

const inventory = loadInventory();
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
const resetButton = document.querySelector("#reset-button");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const statusText = document.querySelector("#status-text");
const statusSpinner = document.querySelector("#status-spinner");
const reloadDataButton = document.querySelector("#reload-data-button");
const analyzeButton = document.querySelector("#analyze-button");
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
  searchableTargets = collectSearchableTargets(finalRecipeCandidates);
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

  return standardAccessories
    .filter((entry) => !existingOutputs.has(entry.name))
    .map((entry) => ({
      id: `${entry.id}@0`,
      name: entry.name,
      outputName: entry.name,
      outputId: entry.id,
      category: "Accesorios",
      plannerCategory: "Accesorios",
      plannerType: "craft",
      tier: `${entry.tier}.0`,
      output: 1,
      source: "Supplemental standard recipe",
      craftedAt: entry.station,
      ingredients: entry.ingredients,
      exact: false,
      enchanted: false,
      priority: recipePriority("Accesorios")
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
    default:
      return "Refining Station";
  }
}

function buildItemIconMap(recipeList) {
  const map = new Map();

  QUICK_ITEMS.forEach((item) => {
    map.set(item.name, item.iconId);
  });

  recipeList.forEach((recipe) => {
    if (recipe.outputId && !map.has(recipe.outputName)) {
      map.set(recipe.outputName, recipe.outputId);
    }
  });

  return map;
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
  const extra = node.querySelector(".plan-card__extra");
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

  if (plan.extraContent instanceof Node) {
    extra.replaceChildren(plan.extraContent.cloneNode(true));
    stepsList.hidden = true;
    notes.hidden = true;
  } else {
    extra.innerHTML = "";
    stepsList.hidden = false;
    notes.hidden = false;
  }

  hydrateIcon(avatar, plan.recipe.outputName, plan.recipe.outputId);
  return node;
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

  const node = buildPlanNode({
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
    extraContent: buildPlanDetails(
      analysis.stepEntries,
      analysis.resourceList,
      analysis.resourceTitle,
      analysis.emptyResourceText
    )
  });

  targetPlan.innerHTML = "";
  node.open = true;
  targetPlan.appendChild(node);
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
      extraContent: buildPlanDetails(
        aggregateStepObjects(result.steps),
        toNamedAmountList(consumed),
        "Consumed materials",
        "This route uses the materials already present in your inventory."
      )
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
        extraContent: buildPlanDetails(
          aggregateStepObjects(result.steps),
          toNamedAmountList(consumed),
          "Consumed materials",
          "This route uses the materials already present in your inventory."
        )
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

  for (const producer of producers.slice(0, 4)) {
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

  for (const producer of producers.slice(0, 4)) {
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
  const names = new Set(QUICK_ITEMS.map((item) => item.name));

  recipeList.forEach((recipe) => {
    names.add(recipe.outputName);
    Object.keys(recipe.ingredients).forEach((name) => names.add(name));
  });

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

function collectSearchableMaterials(recipeList) {
  const names = new Set(QUICK_ITEMS.map((item) => item.name));

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
    .filter((recipe) => !isLikelyNonCraftable(recipe.outputName))
    .map((recipe) => recipe.outputName)
    .filter((name, index, list) => list.indexOf(name) === index)
    .sort((left, right) => left.localeCompare(right));
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
    "Wood"
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

function saveInventory() {
  localStorage.setItem(storageKey, JSON.stringify(inventory));
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

  if (!iconId) {
    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
    return;
  }

  image.src = buildIconUrl(iconId);
  image.hidden = false;
  fallback.hidden = true;
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
}

function getPrimaryRecipeForName(name) {
  return (recipeIndex.get(name) || []).find((recipe) => !recipe.enchanted) || null;
}

function buildPlanDetails(stepEntries, resourceList, resourceTitle, emptyResourceText) {
  const wrapper = document.createElement("section");
  wrapper.className = "target-plan-details";

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
  node.querySelector(".step-card__amount").textContent = `x${outputAmount}`;

  hydrateIcon(node.querySelector(".item-avatar"), entry.recipe.outputName, entry.recipe.outputId);
  return node;
}

function buildMissingItem(name, amount) {
  const template = document.querySelector("#missing-item-template");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector(".missing-item__name").textContent = name;
  node.querySelector(".missing-item__meta").textContent = `Still needed: x${amount}`;
  hydrateIcon(node.querySelector(".item-avatar"), name);
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

  if (type.endsWith(":error")) {
    pending.reject(new Error(payload?.message || "Worker analysis failed."));
  } else {
    pending.resolve(payload);
  }

  workerRequests.delete(requestId);
}

function postWorkerRequest(type, payload) {
  if (!plannerWorker) {
    return Promise.reject(new Error("Planner worker is not available."));
  }

  return new Promise((resolve, reject) => {
    const requestId = `${type}:${workerRequestCounter += 1}`;
    workerRequests.set(requestId, { resolve, reject });
    plannerWorker.postMessage({ type, requestId, payload });
  });
}

async function analyzeInventoryWithWorker(sourceInventory, inventoryKey) {
  if (!plannerWorker) {
    return buildReachablePlans(sourceInventory);
  }

  const plans = await postWorkerRequest("analyzeInventory", {
    inventory: sourceInventory,
    inventoryKey
  });

  return plans.map((plan) => ({
    recipe: plan.recipe,
    outputCount: plan.outputCount,
    steps: plan.stepEntries.map((entry) => describeStep(entry.recipe, entry.runs)),
    consumed: plan.consumed,
    extraContent: buildPlanDetails(plan.stepEntries, plan.resourceList, plan.resourceTitle, plan.emptyResourceText)
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
