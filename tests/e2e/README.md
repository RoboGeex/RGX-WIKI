# End-to-end (E2E) tests

These tests open a real browser, click through the site like a real person, and
check that the main flows still work. You do not need any testing experience to
run them.

## Run the tests

From the `RGX-WIKI` folder:

```bash
npm run test:e2e
```

That's it. Playwright starts the dev server automatically (or reuses one you
already have running on port 3000), runs every test, and prints a pass/fail
list. To watch the browser do its thing, run:

```bash
npm run test:e2e:headed
```

After a run, open the pretty report with:

```bash
npm run test:e2e:report
```

## What is covered

| File | Flow |
| --- | --- |
| `auth.spec.ts` | Login form, wrong password, signup, session persistence, logout, teacher role redirect |
| `student-access.spec.ts` | Locked wiki → unlock page, wrong/right access code, unlock persistence (no unlock loop) |
| `enrollment.spec.ts` | New student joins a class via invite link, teacher sees them in the dashboard |
| `editor.spec.ts` | Developer login, admin dashboard, lesson create → save → publish → delete (ziggy sandbox) |

## Important things to know

- **The tests use the real database** (same as `USE_DB=true` development).
  Everything they create is prefixed with `e2e.pw.` / `e2e-pw-` and is deleted
  automatically when the run finishes — they never touch real students,
  teachers, lessons, or wikis outside the `ziggy` sandbox.
- **Tests marked `fixme` are known bugs**, not test problems. They are skipped
  so the suite stays green, and each one has a comment saying exactly what is
  broken. When a bug is fixed, change `test.fixme(` back to `test(` and the
  test starts guarding against that bug returning.
- Tests run one at a time (not in parallel) because they share one database.
- If a run crashes halfway, the next run cleans up any leftovers before it
  starts, so it is always safe to just run it again.
