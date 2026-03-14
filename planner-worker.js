let recipes = [];
let finalRecipeCandidates = [];
let recipeIndex = new Map();
let ingredientRecipeIndex = new Map();

const inventoryAnalysisCache = new Map();
const targetAnalysisCache = new Map();
const relevantRecipeCache = new Map();

self.onmessage = (event) => {
  const { type, requestId, payload } = event.data || {};

  try {
    if (type === "init") {
      initializeWorker(payload);
      self.postMessage({ type: "init:done", requestId });
      return;
    }

    if (type === "analyzeInventory") {
      const result = analyzeInventory(payload);
      self.postMessage({ type: "analyzeInventory:done", requestId, payload: result });
      return;
    }

    if (type === "analyzeTarget") {
      const result = analyzeTarget(payload);
      self.postMessage({ type: "analyzeTarget:done", requestId, payload: result });
    }
  } catch (error) {
    self.postMessage({
      type: `${type}:error`,
      requestId,
      payload: { message: error instanceof Error ? error.message : String(error) }
    });
  }
};

function initializeWorker(payload) {
  recipes = Array.isArray(payload?.recipes) ? payload.recipes : [];
  recipeIndex = buildRecipeIndex(recipes);
  ingredientRecipeIndex = buildIngredientRecipeIndex(recipes);
  finalRecipeCandidates = recipes
    .filter(isFinalRecipe)
    .filter((recipe) => !recipe.enchanted)
    .sort((left, right) => scoreRecipe(right) - scoreRecipe(left));
  inventoryAnalysisCache.clear();
  targetAnalysisCache.clear();
  relevantRecipeCache.clear();
}

function analyzeInventory(payload) {
  const inventory = payload?.inventory || {};
  const cacheKey = payload?.inventoryKey || "";
  if (inventoryAnalysisCache.has(cacheKey)) {
    return inventoryAnalysisCache.get(cacheKey);
  }

  const plans = [];
  const relevantRecipeSet = collectRelevantRecipes(inventory, cacheKey);
  const candidatePool = finalRecipeCandidates.filter((recipe) => relevantRecipeSet.has(recipe.id));
  const sharedRecipeMemo = new Map();

  for (const recipe of candidatePool) {
    const result = craftAsManyAsPossible(recipe, cloneStock(inventory), sharedRecipeMemo);
    if (!result) continue;

    plans.push(serializePlan(recipe, result, inventory, "Consumed materials", "This route uses the materials already present in your inventory."));
    if (plans.length >= 40) break;
  }

  if (!plans.length) {
    for (const recipe of recipes.filter((entry) => entry.plannerType === "refine" && relevantRecipeSet.has(entry.id))) {
      const result = craftAsManyAsPossible(recipe, cloneStock(inventory), sharedRecipeMemo);
      if (!result) continue;
      plans.push(serializePlan(recipe, result, inventory, "Consumed materials", "This route uses the materials already present in your inventory."));
    }
  }

  const sorted = plans.sort((left, right) => {
    const scoreDiff = scoreRecipe(right.recipe) - scoreRecipe(left.recipe);
    if (scoreDiff !== 0) return scoreDiff;
    if (right.outputCount !== left.outputCount) return right.outputCount - left.outputCount;
    return left.stepEntries.length - right.stepEntries.length;
  });

  inventoryAnalysisCache.set(cacheKey, sorted);
  return sorted;
}

function analyzeTarget(payload) {
  const inventory = payload?.inventory || {};
  const targetName = payload?.targetName || "";
  const desiredAmount = Math.max(1, Number(payload?.desiredAmount) || 1);
  const cacheKey = `${payload?.inventoryKey || ""}::${targetName}::${desiredAmount}`;
  if (targetAnalysisCache.has(cacheKey)) {
    return targetAnalysisCache.get(cacheKey);
  }

  const recipe = getPrimaryRecipeForName(targetName);
  if (!recipe) {
    const empty = { found: false };
    targetAnalysisCache.set(cacheKey, empty);
    return empty;
  }

  const result = planTargetRequirements(recipe, desiredAmount, inventory);
  const consumed = collectConsumed(inventory, result.stock);
  const missingList = toNamedAmountList(result.missing);
  const payloadResult = {
    found: true,
    recipe,
    outputCount: desiredAmount,
    consumed,
    stepEntries: aggregateStepObjects(result.steps),
    resourceList: missingList,
    resourceTitle: "Missing resources",
    emptyResourceText: "You already have all the required resources in your inventory."
  };

  targetAnalysisCache.set(cacheKey, payloadResult);
  return payloadResult;
}

function serializePlan(recipe, result, inventory, resourceTitle, emptyResourceText) {
  const consumed = collectConsumed(inventory, result.stock);
  return {
    recipe,
    outputCount: result.outputCount,
    consumed,
    stepEntries: aggregateStepObjects(result.steps),
    resourceList: toNamedAmountList(consumed),
    resourceTitle,
    emptyResourceText
  };
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

function collectRelevantRecipes(sourceInventory, cacheKey = buildInventoryKey(sourceInventory)) {
  if (relevantRecipeCache.has(cacheKey)) {
    return new Set(relevantRecipeCache.get(cacheKey));
  }

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

  relevantRecipeCache.set(cacheKey, Array.from(relevant));
  return relevant;
}

function craftAsManyAsPossible(recipe, initialStock, sharedMemo = new Map()) {
  let currentStock = cloneStock(initialStock);
  let outputCount = 0;
  let allSteps = [];

  while (true) {
    const crafted = craftRecipe(recipe, currentStock, new Set(), 0, sharedMemo);
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

function craftRecipe(recipe, stock, trail, depth, memo) {
  if (depth > 6 || trail.has(recipe.outputName)) return null;

  const cacheKey = `${recipe.id}|${depth}|${buildInventoryKey(stock)}`;
  if (memo.has(cacheKey)) {
    const cached = memo.get(cacheKey);
    return cached ? { stock: cloneStock(cached.stock), steps: cached.steps.map(cloneStep) } : null;
  }

  let currentStock = cloneStock(stock);
  let collectedSteps = [];
  const nextTrail = new Set(trail);
  nextTrail.add(recipe.outputName);

  for (const [ingredientName, ingredientCount] of Object.entries(recipe.ingredients)) {
    const resolved = satisfyNeed(ingredientName, ingredientCount, currentStock, nextTrail, depth + 1, memo);
    if (!resolved) {
      memo.set(cacheKey, null);
      return null;
    }
    currentStock = resolved.stock;
    collectedSteps = collectedSteps.concat(resolved.steps);
  }

  currentStock[recipe.outputName] = (currentStock[recipe.outputName] || 0) + recipe.output;
  collectedSteps.push({
    key: recipe.id,
    recipe,
    runs: 1
  });

  const result = {
    stock: currentStock,
    steps: collectedSteps
  };
  memo.set(cacheKey, { stock: cloneStock(result.stock), steps: result.steps.map(cloneStep) });
  return result;
}

function satisfyNeed(itemName, count, stock, trail, depth, memo) {
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
      const crafted = craftRecipe(producer, currentStock, trail, depth + 1, memo);
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

function planTargetRequirements(recipe, desiredAmount, sourceInventory) {
  const stock = cloneStock(sourceInventory);
  const steps = [];
  const missing = {};
  const runs = Math.ceil(desiredAmount / Math.max(1, recipe.output || 1));
  const requirementMemo = new Map();

  for (let run = 0; run < runs; run += 1) {
    const resolved = resolveRecipeWithRequirements(recipe, stock, new Set(), 0, requirementMemo);
    steps.push(...resolved.steps);
    mergeCounts(missing, resolved.missing);
  }

  return { stock, steps, missing };
}

function resolveRecipeWithRequirements(recipe, stock, trail, depth, memo) {
  if (depth > 8 || trail.has(recipe.outputName)) {
    return { stock, steps: [], missing: { [recipe.outputName]: 1 } };
  }

  const cacheKey = `${recipe.id}|${depth}|${buildInventoryKey(stock)}`;
  if (memo.has(cacheKey)) {
    const cached = memo.get(cacheKey);
    return {
      stock: cloneStock(cached.stock),
      steps: cached.steps.map(cloneStep),
      missing: { ...cached.missing }
    };
  }

  let currentStock = stock;
  let steps = [];
  let missing = {};
  const nextTrail = new Set(trail);
  nextTrail.add(recipe.outputName);

  for (const [ingredientName, ingredientCount] of Object.entries(recipe.ingredients)) {
    const resolved = resolveNeedWithRequirements(ingredientName, ingredientCount, currentStock, nextTrail, depth + 1, memo);
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

  const result = { stock: currentStock, steps, missing };
  memo.set(cacheKey, {
    stock: cloneStock(result.stock),
    steps: result.steps.map(cloneStep),
    missing: { ...result.missing }
  });
  return result;
}

function resolveNeedWithRequirements(itemName, count, stock, trail, depth, memo) {
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
      const resolved = resolveRecipeWithRequirements(producer, candidateStock, trail, depth + 1, memo);
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

function collectConsumed(before, after) {
  const consumed = {};
  Object.keys(before).forEach((name) => {
    const delta = (before[name] || 0) - (after[name] || 0);
    if (delta > 0) consumed[name] = delta;
  });
  return consumed;
}

function toNamedAmountList(values) {
  return Object.entries(values || {})
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function cloneStock(stock) {
  return Object.fromEntries(Object.entries(stock).map(([name, amount]) => [name, amount]));
}

function cloneStep(step) {
  return {
    key: step.key,
    recipe: step.recipe,
    runs: step.runs
  };
}

function buildInventoryKey(stock) {
  return Object.entries(stock)
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, amount]) => `${name}:${amount}`)
    .join("|");
}

function getPrimaryRecipeForName(name) {
  return (recipeIndex.get(name) || []).find((recipe) => !recipe.enchanted) || null;
}

function isFinalRecipe(recipe) {
  if (recipe.plannerType === "refine") return false;
  if (recipe.enchanted) return false;
  return !recipe.outputName.includes(" .");
}

function scoreRecipe(recipe) {
  return parseTier(recipe.tier) * 100 + (recipe.priority || 0);
}

function parseTier(tierString) {
  return Number(String(tierString).split(".")[0]) || 0;
}
