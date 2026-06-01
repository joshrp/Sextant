import "fake-indexeddb/auto";

import { describe, expect, test } from "vitest";
import { updateFixtures } from "./updateFixtures";

/**
 * Fixture regeneration entry point.
 *
 * This is NOT a normal test — it rewrites the `*.test.fixture.json` files on
 * disk with freshly solved values. It is skipped during `npm test` and only
 * runs when UPDATE_FIXTURES is set, which is what `npm run update:fixtures`
 * does. Pass a name substring via FIXTURE_FILTER to limit which fixtures are
 * regenerated, e.g. `FIXTURE_FILTER=nuclear npm run update:fixtures`.
 */
describe.skipIf(!process.env.UPDATE_FIXTURES)("update solver fixtures", () => {
  test("regenerate expected values", async () => {
    const results = await updateFixtures(process.env.FIXTURE_FILTER || undefined);

    expect(results.length, "no fixtures matched").toBeGreaterThan(0);

    for (const { file, changed, skipped, warnings } of results) {
      const status = skipped ? `skipped (${skipped})` : changed ? "updated" : "unchanged";
      console.log(`${status.padEnd(24)} ${file}`);
      for (const w of warnings) console.warn(`  ⚠ ${w}`);
    }
  }, 120_000);
});
