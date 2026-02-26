# Task: Fix Factory Deletion IDB Data Leak

## Summary

When a factory is deleted from a zone, its IndexedDB entries are never cleaned up. The fix is small and self-contained (4 files).

Zone deletion is already correct — `deleteIdb(zoneId)` drops the entire `Zone_{id}` database. This bug only affects **factory deletion within a live zone**.

---

## Background

Each factory writes two keys into the zone's `factories` IDB object store:

| Key | Content |
|---|---|
| `factoryId` | Full graph state (nodes, edges, goals, solution) |
| `factoryId_historical` | `Historical` sub-store (last-updated timestamp) |

`deleteFactory` in `app/context/ZoneProvider.tsx` currently only calls `removeFactory` on the Zustand store (updating the in-memory factory list). It never touches IDB, so both keys remain on disk indefinitely.

---

## Relevant Files

- `app/context/idb.ts` — IDB helpers; defines the `factories` and `factory-history` object stores
- `app/context/ZoneProvider.tsx` — `deleteFactory` implementation (line ~93)
- `app/context/ZoneContext.ts` — `deleteFactory` type signature (line ~16)
- `app/components/FactoryArchiveHandler.tsx` — the only call site of `deleteFactory` (line ~50)
- `app/factory/store.ts` — shows how the two IDB keys are named (`id`, `id + "_historical"`)

---

## Implementation Steps

### 1. Add `deleteFactoryFromIdb` to `app/context/idb.ts`

Add a new exported async function after the existing `deleteIdb`:

```ts
export async function deleteFactoryFromIdb(idb: IDB, factoryId: string): Promise<void> {
  const db = await idb;
  await db.delete("factories", factoryId);
  await db.delete("factories", factoryId + "_historical");
}
```

> Note: The `factory-history` object store exists in the schema but is not currently written to by `FactoryStore`. No entries to clean there, but the above two keys in `"factories"` are the ones that leak.

### 2. Update `deleteFactory` in `app/context/ZoneProvider.tsx`

Replace the synchronous stub with an async version that cleans IDB first:

```ts
// Before
deleteFactory: (factoryId: string) => {
  if (!storeRef.current) return;
  storeRef.current.getState().removeFactory(factoryId);
},

// After
deleteFactory: async (factoryId: string) => {
  if (!storeRef.current) return;
  if (!idbRef.current) return;
  await deleteFactoryFromIdb(idbRef.current, factoryId);
  storeRef.current.getState().removeFactory(factoryId);
},
```

Also add `deleteFactoryFromIdb` to the import from `./idb`.

### 3. Update the type signature in `app/context/ZoneContext.ts`

```ts
// Before
deleteFactory(factoryId: string): void;

// After
deleteFactory(factoryId: string): Promise<void>;
```

### 4. Await the call in `app/components/FactoryArchiveHandler.tsx`

The call is already inside an `async` try/catch block:

```ts
// Before
zone.deleteFactory(factoryId);

// After
await zone.deleteFactory(factoryId);
```

---

## Test to Add

Add a unit test (e.g. in `app/factory/` or `app/context/`) that:

1. Creates a fake IDB using the existing test helpers (see `app/factory/importexport/importexport.test.ts` for how tests open an in-memory IDB)
2. Writes stub entries for `factoryId` and `factoryId_historical` into the `factories` store
3. Calls `deleteFactoryFromIdb(idb, factoryId)`
4. Asserts both keys no longer exist in the `factories` store

---

## Acceptance Criteria

- [ ] Deleting a factory removes both `factoryId` and `factoryId_historical` from the zone's `factories` IDB store
- [ ] `deleteFactory` is awaited at its call site so errors surface correctly
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Existing tests pass (`npm test`)
- [ ] New unit test covers the IDB cleanup
