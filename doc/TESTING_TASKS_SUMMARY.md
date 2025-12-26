# Testing Tasks - Quick Reference for AI Agents

## Time Estimates

All tasks show two time estimates:
- **👤 Experienced Developer** - Someone familiar with the codebase and tools
- **🤖 AI Agent** - Agent with context but needs iteration/validation

**Agent Multiplier:** ~2-2.5x due to validation cycles, tool learning, and conservative iteration.

---

## 🔴 CRITICAL: Start Here

### Task 1: Expand Solver Coverage
**Time:** 👤 2-4h | 🤖 4-8h  
**Why:** Core business logic, silent failures possible  
**What:** Add edge case tests for circular dependencies, disconnected graphs, scoring methods  
**Tool:** Vitest (already configured)  
**Blocks:** Nothing, extends existing `app/factory/solver/solver.test.tsx`  
**Agent Notes:** Use real recipe IDs from `gameData.ts`, test frequently  

### Task 2: Import/Export Testing
**Time:** 👤 3-4h | 🤖 5-8h  
**Why:** Data loss prevention, user trust  
**What:** Round-trip encoding, version migration, malformed input handling  
**Tool:** Vitest  
**Blocks:** Nothing, pure functions  
**Agent Notes:** Extract encoding logic first, preserve existing API, use `testExports.json`  

---

## 🟡 HIGH VALUE: Do Soon

### Task 3: Graph Model Constraints
**Time:** 👤 4-6h | 🤖 8-12h  
**Why:** Complex transformation between UI and solver  
**What:** Refactor to pure functions, test constraint generation, manifold logic  
**Tool:** Vitest  
**Blocks:** Easier component testing later  
**Agent Notes:** Extract logic from `graphModel.ts`, avoid React Flow types, test solver still works  

### Task 4: Store Action Testing
**Time:** 👤 6-8h | 🤖 12-18h  
**Why:** State integrity, IndexedDB persistence  
**What:** Extract reducers, test mutations, verify persistence  
**Tool:** Vitest + fake-indexeddb  
**Blocks:** Nothing, but highest effort  
**Agent Notes:** Do GraphStore first (most complex), test immutability, use `waitForPersistence()`  

### Task 5: Game Data Utils
**Time:** 👤 2-3h | 🤖 3-5h  
**Why:** Used throughout app, reliability needed  
**What:** Extract lookup/filter helpers from `gameData.ts`, test edge cases  
**Tool:** Vitest  
**Blocks:** Nothing, quick win  
**Agent Notes:** Use real recipe IDs, test with multiple recipes, check performance < 100ms  

---

## 🟢 FOUNDATIONAL: When Ready

### Task 6: Component Testing Setup
**Time:** 👤 4-6h | 🤖 8-12h  
**Why:** Enables future component tests  
**What:** Setup infrastructure, refactor 3 components, establish patterns  
**Tool:** @testing-library/react (needs install)  
**Blocks:** Task 8 (E2E benefits from this)  
**Agent Notes:** Extract logic from components first, use `renderWithRouter()`, test in UI  

### Task 7: Hydration Testing
**Time:** 👤 2h | 🤖 3-4h  
**Why:** Map/Set serialization correctness  
**What:** Test round-trips, nested structures, edge cases  
**Tool:** Vitest  
**Blocks:** Nothing, small isolated task  
**Agent Notes:** Round-trip = serialize → deserialize → compare, test with real store data  

### Task 8: E2E Smoke Tests
**Time:** 👤 4-6h | 🤖 8-12h  
**Why:** Integration confidence  
**What:** 3 critical paths only (create factory, import, navigate)  
**Tool:** Playwright (needs install/setup)  
**Blocks:** Best after Task 6  
**Agent Notes:** Use `test.describe.serial()`, clear IndexedDB between tests, keep minimal  

---

## Task Priority Matrix

| Task | Priority | Agent Time | Dev Time | Dependencies | ROI | Complexity |
|------|----------|------------|----------|--------------|-----|------------|
| 1. Solver Tests | 🔴 | 4-8h | 2-4h | None | ⭐⭐⭐⭐⭐ | Low |
| 2. Import/Export | 🔴 | 5-8h | 3-4h | None | ⭐⭐⭐⭐⭐ | Low-Med |
| 3. Graph Model | 🟡 | 8-12h | 4-6h | Task 1 | ⭐⭐⭐⭐ | Medium |
| 5. Game Data | 🟡 | 3-5h | 2-3h | None | ⭐⭐⭐⭐ | Low |
| 7. Hydration | 🟢 | 3-4h | 2h | None | ⭐⭐⭐ | Low |
| 6. Components | 🟢 | 8-12h | 4-6h | None | ⭐⭐⭐ | Medium |
| 4. Store Actions | 🟡 | 12-18h | 6-8h | None | ⭐⭐⭐ | High |
| 8. E2E | 🟢 | 8-12h | 4-6h | Task 6 | ⭐⭐ | Medium-High |

---

## Recommended Sequence

### For AI Agents (Conservative, ~5-7h/week)

**Weeks 1-2:** Tasks 1, 2 **(10-16h total)**
- Critical path coverage
- Lowest complexity
- Immediate safety net

**Week 3:** Tasks 5, 7 **(6-9h)**
- Quick wins
- Build testing confidence
- Establish patterns

**Weeks 4-5:** Task 3 **(8-12h)**
- Higher complexity refactor
- Significant value
- Careful validation needed

**Weeks 6-7:** Task 6 **(8-12h)**
- Foundation for UI testing
- Moderate complexity
- Long-term investment

**Weeks 8-10:** Task 4 **(12-18h)**
- Highest effort
- Do after gaining experience
- Most thorough testing needed

**Weeks 11-12:** Task 8 **(8-12h)**
- Final integration layer
- Polish for release
- Benefits from all prior work

**Total Agent Time:** 52-79 hours over 12 weeks

### For Experienced Developer (Aggressive, ~4-6h/week)

**Week 1:** Tasks 1, 2 **(5-8h)**  
**Week 2:** Tasks 5, 7 **(4-5h)**  
**Week 3:** Task 3 **(4-6h)**  
**Week 4:** Task 6 **(4-6h)**  
**Weeks 5-6:** Task 4 **(6-8h)**  
**Week 7:** Task 8 **(4-6h)**

**Total Dev Time:** 27-43 hours over 7 weeks

---

## Decision Guide

**Need quick safety net?** → Start with Tasks 1, 2 (critical bugs prevented)  
**Agents working on UI components?** → Do Task 6 first (establish patterns)  
**Agents touching store logic?** → Prioritize Task 4 (prevent state bugs)  
**About to refactor solver?** → Do Task 3 before breaking changes  
**Preparing for beta release?** → Do Task 8 last (integration confidence)  
**Limited time (< 5h)?** → Do Tasks 5 or 7 (quick wins)  
**Want to learn testing?** → Start Task 1 (good examples exist)  

---

## Quick Start Commands

### Initial Setup
```bash
# Run existing tests (baseline)
npm test

# Install for component testing (Task 6)
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Install for store testing (Task 4)
npm install -D fake-indexeddb

# Install for E2E testing (Task 8)
npm install -D @playwright/test
npx playwright install chromium
```

### Running Tests
```bash
# All unit tests
npm test

# Watch mode (during development)
npm test -- --watch

# Specific test file
npm test solver
npm test importexport

# Coverage report
npm test -- --coverage

# E2E tests
npx playwright test

# E2E with visible browser
npx playwright test --headed

# Update snapshots (after intentional changes)
npm test -- -u
```

### Test File Locations
```
app/
  factory/
    solver/
      solver.test.tsx              # Task 1: Expand this
      constraintBuilder.test.ts    # Task 3: Create this
    importexport/
      encoder.test.ts              # Task 2: Create this
  gameData/
    utils.test.ts                  # Task 5: Create this
  hydration.test.ts                # Task 7: Create this
  test/
    fixtures/
      graphs.ts                    # Task 1 & 3: Create this
      exports.ts                   # Task 2: Create this
    setup/
      indexeddb.ts                 # Task 4: Create this
      componentTests.tsx           # Task 6: Create this
    helpers/
      storeHelpers.ts              # Task 4: Create this
  context/
    reducers/
      graphReducers.test.ts        # Task 4: Create this
      zoneReducers.test.ts         # Task 4: Create this
      plannerReducers.test.ts      # Task 4: Create this
e2e/
  tests/
    1-create-factory.spec.ts       # Task 8: Create this
    2-import-factory.spec.ts       # Task 8: Create this
    3-navigation.spec.ts           # Task 8: Create this
```

---

## Agent Success Checklist

### Before Starting a Task
- [ ] Read full task description in `TESTING_ROADMAP.md`
- [ ] Check dependencies are complete
- [ ] Run `npm test` to establish baseline
- [ ] Review files mentioned in task
- [ ] Understand what "success" looks like

### During Implementation
- [ ] Make small, incremental changes
- [ ] Run tests after each logical step
- [ ] For refactoring: verify app still works in UI
- [ ] Add comments explaining non-obvious logic
- [ ] Commit after completing each phase

### Before Marking Complete
- [ ] All new tests pass
- [ ] All existing tests still pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Manual testing (if refactored UI)
- [ ] Tests run in expected time (see task metrics)
- [ ] Code follows existing patterns

### Common Agent Pitfalls
❌ **Changing too much at once** → Refactor incrementally  
❌ **Skipping validation** → Test refactor before adding tests  
❌ **Mock-heavy testing** → Use real data when possible  
❌ **Flaky E2E tests** → Add explicit waits  
❌ **Breaking existing code** → Run full test suite  

### When Stuck
1. Run test in isolation: `npm test <filename>`
2. Add debug logging: `console.log()` in test
3. Check type errors: `npm run typecheck`
4. Review similar existing tests
5. Use `test.only()` to focus on one test
6. For E2E: use `page.pause()` to debug interactively
7. Ask for help with specific error messages

---

## Expected Test Metrics

After completing all tasks:

### Coverage Goals (Focus on High-Risk)
- Solver: 90%+ (core business logic)
- Import/Export: 90%+ (data integrity)
- Store actions: 80%+ (state management)
- Game data utils: 70%+ (utility functions)
- Components: 50%+ (UI logic)
- Overall: 60-70% (targeting high-risk areas)

### Performance Targets
- Unit tests: < 5 seconds total
- Component tests: < 10 seconds total
- Integration tests: < 15 seconds total
- E2E tests: < 2 minutes total
- Full suite (without E2E): < 30 seconds

### Quality Indicators
✅ Zero flaky tests (all pass consistently)  
✅ Clear error messages (actionable failures)  
✅ Snapshots are reviewed (not blindly updated)  
✅ Tests catch real bugs (validate with intentional breaks)  
✅ Tests are maintainable (follow patterns, not brittle)  

---

## Maintenance After Initial Implementation

### Adding New Tests (Ongoing)
- **New solver features** → Add to Task 1 tests
- **New store actions** → Follow Task 4 reducer pattern
- **New components** → Follow Task 6 patterns
- **New import formats** → Add to Task 2 fixtures
- **New critical paths** → Consider Task 8 E2E (sparingly)

### Test Health Checks
```bash
# Weekly: Check test speed
npm test -- --reporter=verbose

# Monthly: Update dependencies
npm update @testing-library/react @playwright/test

# Before release: Full coverage
npm test -- --coverage

# After refactoring: Verify no regressions
npm test && npx playwright test
```

---

## Total Effort Summary

| Role | Total Time | Weeks @ 5h/wk | Weeks @ 10h/wk |
|------|-----------|---------------|----------------|
| 🤖 AI Agent | 52-79 hours | 10-16 weeks | 5-8 weeks |
| 👤 Experienced Dev | 27-43 hours | 5-9 weeks | 3-4 weeks |

**Recommendation for Agents:** Plan 10-12 weeks at ~5-7 hours/week for sustainable progress with quality validation.

**Recommendation for Devs:** Plan 6-8 weeks at ~4-6 hours/week for focused implementation.

---

## Next Steps

1. **Choose starting task** based on decision guide above
2. **Read full task details** in `TESTING_ROADMAP.md`
3. **Set up environment** (install dependencies if needed)
4. **Start with Phase 1** (review/refactor)
5. **Iterate through phases** (don't skip validation)
6. **Mark complete** after checklist verified

---

## Questions?

See detailed implementation steps in `TESTING_ROADMAP.md` for each task.

Common issues and solutions documented in each task's "Agent Notes" section.

Remember: **Quality over speed.** Better to complete one task thoroughly than rush through all tasks with flaky tests.
