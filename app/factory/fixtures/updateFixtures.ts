import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { getTestStoreRunner, type FactoryFixture } from "./index";
import type { Solution } from "../solver/types";
import { setDebugSolver } from "../solver/solver";

/**
 * Regenerates the `expected` block of solver test fixtures by running each
 * fixture through the real solver and writing the resulting values back.
 *
 * Use this when a deliberate change (recipe data, solver scoring, infra costs,
 * etc.) shifts the numbers in many fixtures at once. Review the git diff to
 * confirm the new values are sane — this script does not validate them.
 *
 * It only refreshes the *values* of entries that are already asserted in a
 * fixture's `expected` block. It never adds or removes asserted entries, so the
 * intent of each fixture (which nodes / products / manifolds it checks) is
 * preserved. If an asserted entry no longer exists in the solution, the old
 * value is kept and a warning is logged — that almost always means the fixture
 * itself needs hand-editing.
 *
 * Run via: `npm run update:fixtures` (optionally pass a name substring filter).
 */

const fixturesDir = import.meta.dirname;

/** Only accept finite numbers; everything else is treated as "not present". */
function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Build a fresh `expected` object that mirrors the shape of the existing one
 * (same top-level keys, same asserted entries) but with values taken from
 * `solution`. Logs a warning for every asserted entry missing from `solution`.
 */
export function rebuildExpected(
  name: string,
  existing: NonNullable<FactoryFixture["expected"]>,
  solution: Solution,
  warn: (msg: string) => void
): NonNullable<FactoryFixture["expected"]> {
  const next: NonNullable<FactoryFixture["expected"]> = {} as never;

  if ("objectiveValue" in existing) {
    next.objectiveValue = solution.ObjectiveValue;
  }

  if (existing.nodeCounts) {
    next.nodeCounts = existing.nodeCounts.map(({ nodeId, count }) => {
      const found = solution.nodeCounts.find((n) => n.nodeId === nodeId);
      if (!found) {
        warn(`[${name}] nodeCount "${nodeId}" no longer in solution — keeping ${count}`);
        return { nodeId, count };
      }
      return { nodeId, count: found.count };
    });
  }

  if (existing.infrastructure) {
    const infra: Record<string, number> = {};
    for (const key of Object.keys(existing.infrastructure)) {
      const value = num(solution.infrastructure[key as keyof Solution["infrastructure"]]);
      if (value === undefined) {
        warn(`[${name}] infrastructure "${key}" not on solution — keeping previous value`);
        infra[key] = (existing.infrastructure as Record<string, number>)[key];
      } else {
        infra[key] = value;
      }
    }
    next.infrastructure = infra as never;
  }

  if (existing.products) {
    const rebuildSide = (
      side: "inputs" | "outputs",
      list: { productId: string; amount: number }[]
    ) =>
      list.map(({ productId, amount }) => {
        const found = solution.products[side].find((p) => p.productId === productId);
        if (!found) {
          warn(`[${name}] product ${side} "${productId}" no longer in solution — keeping ${amount}`);
          return { productId, amount };
        }
        return { productId, amount: found.amount };
      });

    type Products = NonNullable<NonNullable<FactoryFixture["expected"]>["products"]>;
    const products: Partial<Products> = {};
    if (existing.products.inputs) {
      products.inputs = rebuildSide("inputs", existing.products.inputs) as never;
    }
    if (existing.products.outputs) {
      products.outputs = rebuildSide("outputs", existing.products.outputs) as never;
    }
    next.products = products as Products;
  }

  if (existing.manifolds) {
    const manifolds: Record<string, number> = {};
    for (const key of Object.keys(existing.manifolds)) {
      const value = num(solution.manifolds[key]);
      if (value === undefined) {
        warn(`[${name}] manifold "${key}" not on solution — keeping previous value`);
        manifolds[key] = (existing.manifolds as Record<string, number>)[key];
      } else {
        manifolds[key] = value;
      }
    }
    next.manifolds = manifolds as never;
  }

  return next;
}

/** Run the solver for one fixture and return its freshly solved Solution. */
async function solveFixture(id: string, fixture: FactoryFixture): Promise<Solution> {
  const [store, prom] = getTestStoreRunner(id, fixture);
  await prom;
  const solution = store.Graph.getState().solution;
  if (!solution) {
    throw new Error(`Fixture "${id}" produced no solution`);
  }
  return solution;
}

export interface UpdateResult {
  file: string;
  changed: boolean;
  skipped?: string;
  warnings: string[];
}

/**
 * Update every `*.test.fixture.json` in the fixtures directory (optionally
 * filtered by `nameFilter` substring). Returns a per-file summary.
 */
export async function updateFixtures(nameFilter?: string): Promise<UpdateResult[]> {
  setDebugSolver(false);

  const files = readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".test.fixture.json"))
    .filter((f) => !nameFilter || f.includes(nameFilter));

  const results: UpdateResult[] = [];

  for (const file of files) {
    const name = basename(file, ".test.fixture.json");
    const path = join(fixturesDir, file);
    const raw = readFileSync(path, "utf-8");
    const fixture = JSON.parse(raw) as FactoryFixture;

    if (!fixture.expected) {
      results.push({ file, changed: false, skipped: "no `expected` block", warnings: [] });
      continue;
    }

    const warnings: string[] = [];
    const solution = await solveFixture(`update-${name}`, fixture);
    fixture.expected = rebuildExpected(name, fixture.expected, solution, (m) => warnings.push(m));

    const output = JSON.stringify(fixture, null, 2) + "\n";
    const changed = output !== raw;
    if (changed) {
      writeFileSync(path, output);
    }
    results.push({ file, changed, warnings });
  }

  return results;
}
