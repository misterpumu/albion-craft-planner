const fs = require("fs");

const appText = fs.readFileSync("app.js", "utf8");
const catalogText = fs.readFileSync("catalog-data.js", "utf8");
const ingredientIconText = fs.existsSync("ingredient-icon-data.js")
  ? fs.readFileSync("ingredient-icon-data.js", "utf8")
  : "window.__ALBION_INGREDIENT_ICONS__ = {};\n";
const catalog = JSON.parse(catalogText.replace(/^window\.__ALBION_CATALOG__ = /, "").replace(/;?\s*$/, ""));
const ingredientIconMap = JSON.parse(
  ingredientIconText.replace(/^window\.__ALBION_INGREDIENT_ICONS__ = /, "").replace(/;?\s*$/, "")
);

const quickItems = [
  "Copper Ore",
  "Tin Ore",
  "Iron Ore",
  "Titanium Ore",
  "Runite Ore",
  "Meteorite Ore",
  "Adamantium Ore",
  "Copper Bar",
  "Bronze Bar",
  "Steel Bar",
  "Titanium Steel Bar",
  "Runite Steel Bar",
  "Meteorite Steel Bar",
  "Adamantium Steel Bar",
  "Birch Logs",
  "Chestnut Logs",
  "Pine Logs",
  "Cedar Logs",
  "Bloodoak Logs",
  "Ashenbark Logs",
  "Whitewood Logs",
  "Birch Planks",
  "Chestnut Planks",
  "Pine Planks",
  "Cedar Planks",
  "Bloodoak Planks",
  "Ashenbark Planks",
  "Whitewood Planks",
  "Cotton",
  "Flax",
  "Hemp",
  "Skyflower",
  "Sunflax",
  "Ghost Hemp",
  "Fogflower",
  "Simple Cloth",
  "Neat Cloth",
  "Fine Cloth",
  "Ornate Cloth",
  "Lavish Cloth",
  "Opulent Cloth",
  "Exquisite Cloth",
  "Rugged Hide",
  "Thin Hide",
  "Medium Hide",
  "Heavy Hide",
  "Thick Hide",
  "Robust Hide",
  "Resilient Hide",
  "Stiff Leather",
  "Thick Leather",
  "Reinforced Leather",
  "Worked Leather",
  "Hardened Leather",
  "Fortified Leather",
  "Imbued Leather"
];
const aliases = extractAliasMap(appText, "MATERIAL_NAME_ALIASES");
const manualIconIds = extractObjectMap(appText, "MANUAL_ICON_IDS");

const iconMap = new Map();
const ingredientUsage = new Map();

for (const name of quickItems) {
  iconMap.set(name, "local-list");
}

for (const [name, iconId] of Object.entries(ingredientIconMap)) {
  iconMap.set(name, iconId);
}

for (const [name, iconId] of manualIconIds.entries()) {
  iconMap.set(name, iconId);
}

for (const recipe of catalog.recipes) {
  const outputId = String(recipe.id || "").split("@")[0];
  if (recipe.name && outputId && !iconMap.has(recipe.name)) {
    iconMap.set(recipe.name, outputId);
  }

  for (const name of Object.keys(recipe.ingredients || {})) {
    ingredientUsage.set(name, (ingredientUsage.get(name) || 0) + 1);
  }
}

for (const [name, mapped] of aliases.entries()) {
  if (iconMap.has(mapped) && !iconMap.has(name)) {
    iconMap.set(name, `alias:${mapped}`);
  }
}

for (const name of ingredientUsage.keys()) {
  const normalized = normalizeVariant(name);
  if (normalized !== name && iconMap.has(normalized) && !iconMap.has(name)) {
    iconMap.set(name, `variant:${normalized}`);
  }
}

const missing = [...ingredientUsage.entries()]
  .filter(([name]) => !iconMap.has(name))
  .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

console.log(`Ingredient names checked: ${ingredientUsage.size}`);
console.log(`Ingredient names with icon mapping: ${ingredientUsage.size - missing.length}`);
console.log(`Ingredient names missing icon mapping: ${missing.length}`);
console.log("");
console.log("Top missing ingredient names:");
for (const [name, count] of missing.slice(0, 120)) {
  console.log(`${String(count).padStart(4, " ")}  ${name}`);
}

function extractStringArray(source, constName) {
  const match = source.match(new RegExp(`const ${constName} = \\[((?:.|\\r|\\n)*?)\\];`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function extractAliasMap(source, constName) {
  const match = source.match(new RegExp(`const ${constName} = \\{((?:.|\\r|\\n)*?)\\};`));
  const map = new Map();
  if (!match) return map;
  for (const entry of match[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
    map.set(entry[1], entry[2]);
  }
  return map;
}

function extractObjectMap(source, constName) {
  const match = source.match(new RegExp(`const ${constName} = \\{((?:.|\\r|\\n)*?)\\};`));
  const map = new Map();
  if (!match) return map;
  for (const entry of match[1].matchAll(/([A-Za-z0-9_' -]+|"[^"]+"):\s*"([^"]+)"/g)) {
    const rawKey = entry[1];
    const key = rawKey.startsWith('"') ? rawKey.slice(1, -1) : rawKey.trim();
    map.set(key, entry[2]);
  }
  return map;
}

function normalizeVariant(name) {
  return String(name)
    .replace(/^(Uncommon|Rare|Exceptional|Pristine|Fine|Excellent)\s+/, "")
    .trim();
}
