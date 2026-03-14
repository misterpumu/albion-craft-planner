const fs = require("fs");

const OUTPUT_FILE = "catalog-data.js";
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
  const recipes = [];
  const failures = [];

  await mapWithConcurrency(items, 6, async (item, index) => {
    process.stdout.write(`item ${index + 1}/${items.length}\r`);

    try {
      const detail = await fetchAlbionDbItem(String(item.name || "").trim());
      if (!detail) {
        failures.push({ name: item.name, identifier: item.identifier, reason: "missing-item-json" });
        return;
      }

      if (looksLikeUniqueName(item.identifier) && detail.uniqueName !== item.identifier) {
        failures.push({
          name: item.name,
          identifier: item.identifier,
          reason: `identifier-mismatch:${detail.uniqueName}`
        });
        return;
      }

      const itemRecipes = extractRecipes(detail);
      if (!itemRecipes.length) {
        failures.push({ name: item.name, identifier: item.identifier, reason: "no-crafting-data" });
        return;
      }

      recipes.push(...itemRecipes);
    } catch (error) {
      failures.push({ name: item.name, identifier: item.identifier, reason: error.message });
    }
  });

  process.stdout.write("\n");

  const deduped = dedupeById(recipes);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Albion Database item pages + OpenAlbion catalog",
    totalItemsAttempted: items.length,
    totalRecipes: deduped.length,
    failures
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    `window.__ALBION_CATALOG__ = ${JSON.stringify({ ...payload, recipes: deduped })};\n`,
    "utf8"
  );

  console.log(`generated ${deduped.length} recipes from ${items.length} items`);
  console.log(`failures ${failures.length}`);
}

async function fetchEndpoint(endpoint) {
  const response = await fetch(`${OPENALBION_BASE}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`OpenAlbion ${endpoint} failed with ${response.status}`);
  }

  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchAlbionDbItem(name) {
  const slug = toSlug(name);
  const response = await fetch(`${ALBION_DB_BASE}/${slug}`);
  if (!response.ok) {
    throw new Error(`Albion Database ${slug} failed with ${response.status}`);
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

function extractRecipes(detail) {
  const recipes = [];

  if (detail.crafting && Array.isArray(detail.crafting.resources) && detail.crafting.resources.length) {
    recipes.push(buildRecipe(detail, detail.enchantmentLevel || 0, detail.crafting, false));
  }

  if (Array.isArray(detail.enchantments)) {
    detail.enchantments.forEach((enchantment) => {
      if (enchantment.crafting && Array.isArray(enchantment.crafting.resources) && enchantment.crafting.resources.length) {
        recipes.push(buildRecipe(detail, enchantment.level, enchantment.crafting, true));
      }
    });
  }

  return recipes;
}

function buildRecipe(detail, enchantmentLevel, crafting, isEnchanted) {
  const suffix = enchantmentLevel > 0 ? ` .${enchantmentLevel}` : "";
  return {
    id: `${detail.uniqueName}@${enchantmentLevel}`,
    name: `${detail.name}${suffix}`,
    category: mapCategory(detail.category),
    tier: `${detail.tier}.0`,
    output: crafting.amountCrafted || 1,
    source: "Exact recipe from Albion Database",
    craftedAt: detail.craftedAt?.name || "",
    ingredients: Object.fromEntries(
      crafting.resources.map((resource) => [resource.name, resource.count])
    ),
    exact: true,
    enchanted: isEnchanted
  };
}

function mapCategory(category) {
  switch (category) {
    case "weapons":
      return "Armas";
    case "armor":
      return "Armadura";
    case "consumables":
      return "Consumibles";
    case "mounts":
      return "Monturas";
    case "bags":
    case "capes":
    case "off-hands":
    case "accessories":
      return "Accesorios";
    default:
      return "Otros";
  }
}

function dedupeById(list) {
  const seen = new Set();
  return list.filter((recipe) => {
    if (seen.has(recipe.id)) return false;
    seen.add(recipe.id);
    return true;
  });
}

function toSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function looksLikeUniqueName(value) {
  return /^[A-Z0-9_]+$/.test(String(value || ""));
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
