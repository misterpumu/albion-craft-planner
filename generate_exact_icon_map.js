const fs = require("fs");

const OUTPUT_FILE = "ingredient-icon-data.js";
const OPENALBION_BASE = "https://api.openalbion.com/api/v3";
const ALBION_DB_BASE = "https://www.albiondatabase.com/items";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const [weapons, armors, accessories, consumables] = await Promise.all([
    fetchEndpoint("weapons"),
    fetchEndpoint("armors"),
    fetchEndpoint("accessories"),
    fetchEndpoint("consumables")
  ]);

  const items = [...weapons, ...armors, ...accessories, ...consumables];
  const iconMap = new Map();

  await mapWithConcurrency(items, 6, async (item, index) => {
    process.stdout.write(`item ${index + 1}/${items.length}\r`);
    const detail = await fetchAlbionDbItem(String(item.name || "").trim());
    if (!detail) return;

    if (detail.name && detail.uniqueName) {
      iconMap.set(detail.name, detail.uniqueName);
    }

    collectResourceIcons(detail.crafting, iconMap);

    if (Array.isArray(detail.enchantments)) {
      detail.enchantments.forEach((enchantment) => collectResourceIcons(enchantment.crafting, iconMap));
    }
  });

  process.stdout.write("\n");

  await mapWithConcurrency(consumables, 6, async (consumable) => {
    const response = await fetch(`${OPENALBION_BASE}/consumable-craftings/consumable/${consumable.id}`);
    if (!response.ok) return;
    const json = await response.json();

    for (const entry of json.data || []) {
      const requirements = Array.isArray(entry.crafting?.requirements) ? entry.crafting.requirements : [];
      for (const requirement of requirements) {
        if (requirement?.name && requirement?.identifier && !iconMap.has(requirement.name)) {
          iconMap.set(requirement.name, requirement.identifier);
        }
      }
    }
  });

  const manualIds = {
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

  Object.entries(manualIds).forEach(([name, iconId]) => {
    if (!iconMap.has(name)) {
      iconMap.set(name, iconId);
    }
  });

  const sorted = Object.fromEntries(
    [...iconMap.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  );

  fs.writeFileSync(
    OUTPUT_FILE,
    `window.__ALBION_INGREDIENT_ICONS__ = ${JSON.stringify(sorted, null, 2)};\n`,
    "utf8"
  );

  console.log(`generated ${iconMap.size} exact ingredient icons`);
}

function collectResourceIcons(crafting, iconMap) {
  if (!crafting || !Array.isArray(crafting.resources)) return;

  crafting.resources.forEach((resource) => {
    if (resource?.name && resource?.uniqueName && !iconMap.has(resource.name)) {
      iconMap.set(resource.name, resource.uniqueName);
    }
  });
}

async function fetchEndpoint(endpoint) {
  const response = await fetch(`${OPENALBION_BASE}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`OpenAlbion ${endpoint} failed with ${response.status}`);
  }
  return response.json().then((json) => (Array.isArray(json.data) ? json.data : []));
}

async function fetchAlbionDbItem(name) {
  const slug = toSlug(name);
  const response = await fetch(`${ALBION_DB_BASE}/${slug}`);
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  return parseItemObjectFromHtml(html);
}

function parseItemObjectFromHtml(html) {
  const marker = '{\\"item\\":';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const objectString = extractBalancedObject(html, start);
  if (!objectString) return null;

  return JSON.parse(unescapeNextString(objectString)).item;
}

function extractBalancedObject(input, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return input.slice(startIndex, index + 1);
    }
  }

  return null;
}

function unescapeNextString(text) {
  return text
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'");
}

function toSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['â€™.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function mapWithConcurrency(items, concurrency, mapper) {
  let index = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
}
