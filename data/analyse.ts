#!/usr/bin/env ts-node
import { writeFileSync } from "fs";

import commandLineArgs from 'command-line-args';

import { formatNumber } from "~/uiUtils";
import { loadData, type ProductId, type Recipe, type RecipeId } from "../app/factory/graph/loadJsonData";

const { products } = loadData();

const terminalProducts = [
  "Product_Gold",
  "Product_Steel",
  "Product_TitaniumAlloy",
  "Product_Plastic",
  "Product_Glass",
  "Product_PolySilicon",
  "Product_ConcreteSlab",
  "Product_Rubber",
  "Product_Copper",
  "Product_Iron",
  "Product_Wood",
  "Product_Water",
  "Product_Sulfur",
  "Product_Limestone",
  "Product_Rock",
  "Product_Ethanol",
  "Product_Ammonia",
  "Product_Diesel",
  "Product_Coal",
  "Product_Sugar",
  "Product_HydrogenFluoride",
  "Product_FoodPack",
  "Product_Slag",
  "Product_FuelGas",
  "Product_Aluminum",
  "Product_CrudeOil",
  "Product_LightOil",
  "Product_MediumOil",
  "Product_Oxygen",
  "Product_CarbonDioxide",
  "Product_Brine",
  "Product_Nitrogen",
  "Product_Hydrogen",
  "Product_SeaWater",

  "Product_Biomass",
  "Product_Fertilizer",
  "Product_Fertilizer_Organic",
  "Product_Fertilizer_3",
  "Product_AnimalFeed",
  "Product_BlanketFuelEnriched",
  "Product_SteamHi",
  "Product_SteamLo",
  "Product_SteamSp",
] as const;
type TerminalProductId = typeof terminalProducts[number];

const ignoreRecipes = [
  "MechPartsAssemblyT5Iron"
];

function isTerminalProduct(id: TerminalProductId | string): id is TerminalProductId {
  return terminalProducts.includes(id as TerminalProductId);
}

type ProductionMethods = {
  productId: ProductId;
  productName: string;
  choiceAnalyses?: { [recipeId: string]: Analysis };
} & Analysis;

type Analysis = {
  recipeChain: string[];
  inputs: Partial<{ [K in TerminalProductId]: number }>;
  outputs: Partial<{ [K in ProductId]: number }>;
  routes: number;
  choices: {
    productId: string;
    recipes: RecipeId[];
  }[];
  minChoice: {
    recipeId: (RecipeId | "Unknown")[];
    cost: number;
  };
  maxChoice: {
    recipeId: (RecipeId | "Unknown")[];
    cost: number;
  };
};

let DEBUG_LOG = false;
const debug = (...args: unknown[]) => {
  if (DEBUG_LOG)
    console.log(...args);
}

const productsSeen = new Map<string, ProductionMethods>();

let depth = 0;
function analyseProduct(productId: ProductId): ProductionMethods {
  if (productsSeen.has(productId)) {
    debug(" ".repeat(depth * 2), "Already seen", productId);
    return productsSeen.get(productId)!;
  }
  debug(" ".repeat(depth * 2), "Analysing", productId);

  productsSeen.set(productId, {
    productId,
    productName: products.get(productId)?.name || "Unknown",
    routes: -1,
    recipeChain: [],
    inputs: {},
    outputs: {},
    choices: [],
    minChoice: { recipeId: ["Unknown"], cost: Infinity },
    maxChoice: { recipeId: ["Unknown"], cost: -Infinity },
  });

  const product = products.get(productId as ProductId);
  if (!product) throw new Error("Product not found: " + productId);

  // Find all recipes that produce this product (that aren't just balancers)
  // filtering to only unique tierLink values
  const seenTierLinks = new Set<string | undefined>();
  const uniquieProducingRecipes = product.recipes.output.filter(r => {
    if (r.machine.id.startsWith("Balancer")) return false;
    if (r.id.includes("Scrap")) return false; // Ignore scrap recipes

    if (r.tiersLink) {
      if (seenTierLinks.has(r.tiersLink)) return false;
      seenTierLinks.add(r.tiersLink);
    }
    return true;
  });

  // Filter out any recipe that has a better version with the same inputs and outputs
  const producingRecipes = uniquieProducingRecipes.filter((r) => {
    if (ignoreRecipes.includes(r.id)) return false;
    for (const other of uniquieProducingRecipes) {
      if (r.id === other.id) continue;
      if (isImprovedRecipe(other, r)) {
        debug(" ".repeat(depth * 2), `Filtering out recipe ${r.id} in favor of improved ${other.id}`);
        return false;
      }
    }
    return true;
  });

  let result: ProductionMethods;

  if (producingRecipes.length == 0) {
    result = {
      productId,
      productName: product.name,
      routes: 0,
      recipeChain: [],
      inputs: {},
      outputs: {},
      choices: [],
      minChoice: { recipeId: ["Terminal" as RecipeId], cost: getWeighting(productId) },
      maxChoice: { recipeId: ["Terminal" as RecipeId], cost: getWeighting(productId) },
    };
    
    debug(" ".repeat(depth * 2), "No producing recipes for", productId);
  }

  if (producingRecipes.length > 1) {
    debug(" ".repeat(depth * 2), "Multiple producing recipes for", productId);

    // Kick off an analysis of this recipe to analyse each choice later
    const choiceAnalyses: ProductionMethods["choiceAnalyses"] = {};

    const minChoice: Analysis["minChoice"] = { recipeId: ["Unknown"], cost: Infinity };
    const maxChoice: Analysis["maxChoice"] = { recipeId: ["Unknown"], cost: -Infinity };
    for (const recipe of producingRecipes) {
      depth++;
      debug(" ".repeat(depth * 2), "Analysing recipe choice", recipe.id, "for", productId);
      choiceAnalyses[recipe.id] = analyseRecipe(recipe, productId);

      if (choiceAnalyses[recipe.id].minChoice.cost < minChoice.cost) {
        minChoice.cost = choiceAnalyses[recipe.id].minChoice.cost;
        minChoice.recipeId = [recipe.id, ...choiceAnalyses[recipe.id].minChoice.recipeId];
      }
      if (choiceAnalyses[recipe.id].maxChoice.cost > maxChoice.cost) {
        maxChoice.cost = choiceAnalyses[recipe.id].maxChoice.cost;
        maxChoice.recipeId = [recipe.id, ...choiceAnalyses[recipe.id].maxChoice.recipeId];
      }
      depth--;
    }

    result = {
      productId,
      productName: product.name,
      routes: producingRecipes.length,
      choices: [{
        productId,
        recipes: producingRecipes.map(r => r.id)
      }],
      choiceAnalyses,
      recipeChain: [],
      inputs: { [productId]: 1 },
      outputs: {},
      minChoice, maxChoice
    };
  }

  if (producingRecipes.length === 1) {
    // Only one recipe produces this product, so we can follow it down
    const recipe = producingRecipes[0];

    result = {
      productId,
      productName: product.name,
      ...analyseRecipe(recipe, productId)
    };

  }
  
  if (result! === undefined) throw new Error("No result for product: " + productId);
  //show min and max cost
  debug(" ".repeat(depth * 2), `Product ${productId} analysed with ${result.routes} routes - Min Cost: ${formatNumber(result.minChoice.cost)} (via ${result.minChoice.recipeId}) - Max Cost: ${formatNumber(result.maxChoice.cost)} (via ${result.maxChoice.recipeId})`);
  productsSeen.set(productId, result);
  return result;
}

export function analyseRecipe(recipe: Recipe, productId: ProductId): Analysis {
  const result: Analysis = {
    recipeChain: [recipe.id],
    inputs: {},
    outputs: {},
    routes: 1,
    choices: [],
    minChoice: { recipeId: ["Unknown"], cost: 0 },
    maxChoice: { recipeId: ["Unknown"], cost: 0 },
  };

  const outputQuantity = recipe.outputs.find(o => o.product.id === productId)?.quantity;
  if (undefined === outputQuantity) throw new Error("Recipe does not produce product: " + recipe.id + " -> " + productId);

  for (const output of recipe.outputs) {
    result.outputs[output.product.id] = output.quantity / outputQuantity;
  }

  for (const input of recipe.inputs) {
    depth++;
    const recipeRatio = input.quantity / outputQuantity;
    const productDebug = `${input.product.id} ( x ${formatNumber(recipeRatio)})`;

    if (input.product.id === productId) {
      debug(" ".repeat(depth * 2), "Ignoring self-loop");
      depth--;
      continue; // Ignore self-loop inputs
    }

    if (isTerminalProduct(input.product.id)) {
      debug(" ".repeat(depth * 2), "Terminal Product -", productDebug);
      result.inputs[input.product.id as TerminalProductId] = (result.inputs[input.product.id as TerminalProductId] || 0) + recipeRatio;
      result.minChoice.cost += recipeRatio;
      result.maxChoice.cost += recipeRatio;
      result.minChoice.recipeId = [recipe.id];
      result.maxChoice.recipeId = [recipe.id];
    } else {
      debug(" ".repeat(depth * 2), "Input", productDebug);

      let subAnalysis = productsSeen.get(input.product.id)!;

      if (!subAnalysis) {
        debug(" ".repeat(depth * 2), "Recursing into", productDebug);
        depth++;
        subAnalysis = analyseProduct(input.product.id);
        depth--;
      }

      if (subAnalysis.routes === -1) {
        debug(" ".repeat(depth * 2), "Loop detected on", productDebug);
      } else {
        if (subAnalysis.routes === 0) {
          debug(" ".repeat(depth * 2), "Pseudo-terminal input", productDebug);
          // Sub-analysis has no producing recipes, so treat as terminal
          result.inputs[input.product.id as TerminalProductId] = (result.inputs[input.product.id as TerminalProductId] || 0) + recipeRatio;
        } else {
          debug(" ".repeat(depth * 2), "Input", input.product.id, "is fully resolved with", Object.keys(subAnalysis.inputs).length, "inputs");
          for (const [k, v] of (Object.entries(subAnalysis.inputs) as [TerminalProductId, number][])) {
            (result.inputs[k] ||= 0)
            result.inputs[k] += v * recipeRatio;
          }
        }
        if (subAnalysis.choices.length > 0) {
          debug(" ".repeat(depth * 2), input.product.id, "has", subAnalysis.choices.length, "choices");
          result.choices.push(...subAnalysis.choices);
          result.routes *= subAnalysis.routes;

          result.minChoice.cost += subAnalysis.minChoice.cost * recipeRatio;
          result.minChoice.recipeId = subAnalysis.minChoice.recipeId;
          result.maxChoice.cost += subAnalysis.maxChoice.cost * recipeRatio;
          result.maxChoice.recipeId = subAnalysis.maxChoice.recipeId;
        } else {
          result.minChoice.cost += subAnalysis.minChoice.cost * recipeRatio;
          result.maxChoice.cost += subAnalysis.maxChoice.cost * recipeRatio;
          result.maxChoice.recipeId = subAnalysis.maxChoice.recipeId;
          result.minChoice.recipeId = subAnalysis.minChoice.recipeId;
        }
      
        
        result.recipeChain.push(...subAnalysis.recipeChain);
      }
    }
    depth--;
  }
  return result;
}

export function analyseAllProducts() {
  const analyses = [];
  let i = 0;
  for (const [id, product] of products.entries()) {
    i++;
    debug(`\nAnalysing product ${i} of ${products.size}: ${product.name} (${product.id})`);
    const analysis = analyseProduct(id);
    if (analysis)
      analyses.push(analysis);
    debug("\n".padEnd(80, "-"));
  }
  // writeFileSync("product-analyses.json", JSON.stringify(analyses, null, 2));
  return analyses;
}


function main() {
  const options = commandLineArgs([{
    name: 'debug', type: Boolean, defaultValue: true, alias: 'd'
  }, {
    name: 'product', type: String, alias: 'p'
  }, {
    name: 'output', type: String, alias: 'o'
  }]);

  if (options.debug) {
    DEBUG_LOG = true;
  }

  let analyses: ProductionMethods[] = [];

  if (options.product) {
    if (!products.has(options.product as ProductId)) {
      console.error("Product not found", options.product); process.exit(1);
    }

    console.log("Analysing product", options.product);
    analyses = [analyseProduct(options.product as ProductId)];
    // console.log(JSON.stringify(analyses, null, 2));
  } else {
    console.log("Analysing all products...");
    analyses = analyseAllProducts();
  }

  for (const analysis of productsSeen.values()) {
    if (!analysis.choiceAnalyses) continue;
    
    console.log("".padEnd(80, "-"));
    console.log(`${analysis.productName} has ${Object.keys(analysis.choices[0].recipes).length} choices`);
    console.log(" ".repeat(depth * 2), `Choice: ${analysis.productName} - Min Cost: ${formatNumber(analysis.minChoice.cost, "", 3)} (via ${analysis.minChoice.recipeId}) - Max Cost: ${formatNumber(analysis.maxChoice.cost, "", 3)} (via ${analysis.maxChoice.recipeId})`);  
    for (const [recipeId, choiceAnalysis] of Object.entries(analysis.choiceAnalyses)) {
    }
  }

  const str = JSON.stringify(analyses, null, 2);
  console.log(`Analysed ${analyses.length} products. Output is ${(str.length / 1024).toFixed(2)}KB`);
  if (options.output)
    console.log(str);
  else
    writeFileSync("./product-analyses.json", str);
}

function getWeighting(productId: ProductId): number {
  if (productId === "Product_Virtual_Electricity" as ProductId) return 1000;
  return 1;
}




// if a and b are recipes that produce the same product, using the same input, which one has the better ratio
const isImprovedRecipe = (a: Recipe, b: Recipe) => {
  if (a.outputs.length !== b.outputs.length) return false;
  if (a.inputs.length !== b.inputs.length) return false;

  a.outputs.sort((x, y) => x.product.id.localeCompare(y.product.id));
  b.outputs.sort((x, y) => x.product.id.localeCompare(y.product.id));
  a.inputs.sort((x, y) => x.product.id.localeCompare(y.product.id));
  b.inputs.sort((x, y) => x.product.id.localeCompare(y.product.id));

  for (let i = 0; i < a.outputs.length; i++) {
    if (a.outputs[i].product.id !== b.outputs[i].product.id) return false;
  }
  for (let i = 0; i < a.inputs.length; i++) {
    if (a.inputs[i].product.id !== b.inputs[i].product.id) return false;
  }

  // Now we know they have the same inputs and outputs, compare ratios of total input to output
  const aInput = a.inputs.reduce((sum, item) => sum + item.quantity, 0);
  const aOutput = a.outputs.reduce((sum, item) => sum + item.quantity, 0);
  const bInput = b.inputs.reduce((sum, item) => sum + item.quantity, 0);
  const bOutput = b.outputs.reduce((sum, item) => sum + item.quantity, 0);

  const aRatio = aOutput / aInput;
  const bRatio = bOutput / bInput;

  return aRatio > bRatio;
}



// If run directly, output analysis to console
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
