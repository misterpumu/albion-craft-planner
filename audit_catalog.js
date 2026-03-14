const fs = require("fs");
const vm = require("vm");

const CATALOG_FILE = "catalog-data.js";
const MATERIAL_NAME_ALIASES = {
  "Baroque Cloth": "Exquisite Cloth",
  "Cured Leather": "Worked Leather"
};

const TIER_NAMES = {
  2: "Novice's",
  3: "Journeyman's",
  4: "Adept's",
  5: "Expert's",
  6: "Master's",
  7: "Grandmaster's",
  8: "Elder's"
};

const EXPECTED_GROUPS = [
  {
    group: "basic_accessories",
    tiers: [2, 3, 4, 5, 6, 7, 8],
    items: ["Bag", "Cape", "Shield", "Torch"]
  },
  {
    group: "starter_core",
    tiers: [2, 3, 4, 5, 6, 7, 8],
    items: [
      "Soldier Armor",
      "Soldier Helmet",
      "Soldier Boots",
      "Scholar Robe",
      "Scholar Cowl",
      "Scholar Sandals",
      "Mercenary Jacket",
      "Mercenary Hood",
      "Mercenary Shoes",
      "Broadsword",
      "Bow",
      "Fire Staff"
    ]
  },
  {
    group: "journeyman_plus_core",
    tiers: [3, 4, 5, 6, 7, 8],
    items: [
      "Battleaxe",
      "Mace",
      "Hammer",
      "Spear",
      "Quarterstaff",
      "Crossbow",
      "Dagger",
      "Arcane Staff",
      "Frost Staff",
      "Holy Staff",
      "Nature Staff",
      "Cursed Staff"
    ]
  },
  {
    group: "adept_plus_standard",
    tiers: [4, 5, 6, 7, 8],
    items: [
      "Greataxe",
      "Halberd",
      "Heavy Mace",
      "Morning Star",
      "Polehammer",
      "Great Hammer",
      "Pike",
      "Glaive",
      "Iron-clad Staff",
      "Double Bladed Staff",
      "Warbow",
      "Longbow",
      "Heavy Crossbow",
      "Light Crossbow",
      "Dagger Pair",
      "Great Arcane Staff",
      "Great Fire Staff",
      "Great Frost Staff",
      "Great Holy Staff",
      "Great Nature Staff",
      "Great Cursed Staff",
      "Cleric Robe",
      "Mage Robe",
      "Hunter Jacket",
      "Assassin Jacket",
      "Knight Armor",
      "Guardian Armor",
      "Cleric Cowl",
      "Mage Cowl",
      "Hunter Hood",
      "Assassin Hood",
      "Knight Helmet",
      "Guardian Helmet",
      "Cleric Sandals",
      "Mage Sandals",
      "Hunter Shoes",
      "Assassin Shoes",
      "Knight Boots",
      "Guardian Boots",
      "Mistcaller",
      "Muisak",
      "Facebreaker",
      "Cryptcandle",
      "Leering Cane",
      "Tome of Spells",
      "Sarcophagus",
      "Caitiff Shield"
    ]
  }
];

main();

function main() {
  const catalog = loadCatalog(CATALOG_FILE);
  const exactRecipes = catalog.recipes.filter((recipe) => recipe.exact && !recipe.enchanted);
  const exactNames = new Set(exactRecipes.map((recipe) => recipe.name));
  const ingredientNames = collectIngredientNames(exactRecipes);
  const aliasUsage = buildAliasUsage(ingredientNames);
  const missingGroups = auditExpectedGroups(exactNames);
  const nonCraftableFailures = (catalog.failures || []).filter((entry) => looksLikeCraftableStandard(entry.name));

  const report = {
    generatedAt: catalog.generatedAt || "",
    totalExactRecipes: exactRecipes.length,
    missingRecipeCount: missingGroups.reduce((sum, group) => sum + group.missing.length, 0),
    missingGroups,
    aliasUsage,
    craftableLookingFailures: nonCraftableFailures
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function loadCatalog(path) {
  const code = fs.readFileSync(path, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window.__ALBION_CATALOG__;
}

function collectIngredientNames(recipes) {
  const names = new Set();
  recipes.forEach((recipe) => {
    Object.keys(recipe.ingredients || {}).forEach((name) => names.add(name));
  });
  return names;
}

function buildAliasUsage(ingredientNames) {
  return Object.entries(MATERIAL_NAME_ALIASES)
    .filter(([alias]) => ingredientNames.has(alias))
    .map(([alias, normalized]) => ({ alias, normalized }));
}

function auditExpectedGroups(exactNames) {
  return EXPECTED_GROUPS.map((group) => {
    const missing = [];

    group.tiers.forEach((tier) => {
      group.items.forEach((item) => {
        const name = `${TIER_NAMES[tier]} ${item}`;
        if (!exactNames.has(name)) {
          missing.push(name);
        }
      });
    });

    return {
      group: group.group,
      missing
    };
  }).filter((group) => group.missing.length > 0);
}

function looksLikeCraftableStandard(name) {
  const value = String(name || "");
  if (!value) return false;

  if (
    value.startsWith("Recruiter's ") ||
    value.startsWith("Silver ") ||
    value.startsWith("Gold ") ||
    value.startsWith("Crystal ")
  ) {
    return false;
  }

  return /^(Novice's|Journeyman's|Adept's|Expert's|Master's|Grandmaster's|Elder's)\s/.test(value);
}
