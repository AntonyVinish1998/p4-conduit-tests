# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-20

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v26.13.1
- **My whole suite on my laptop:** `npx playwright test` → 23 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js: v26.13.1, my laptop’s version. So that is the only version I have proof for. If GitHub uses Node.js 26 too, a green run there proves the same thing. If it uses 22, I have not tested that yet.
  - Packages: npm ci, because it installs exactly the versions in package-lock.json, the same ones as on my laptop. npm install could choose newer versions, and then a green run would not prove the same thing.
  - Browser: Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js 26, the version my suite is proven on, install the packages with npm ci, and install only Chromium with npx playwright install --with-deps chromium.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** my own workflow already had `node-version: 26`, because my rule asked for it. So I judged a Set up Node.js step from another run: `node-version: 22` (lines 13–17).
- **Claude said:** "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js 26 (my laptop: v26.13.1) · packages with `npm ci` · Chromium only
- **My answer to the developer:** Not as it is. Node.js 22 meets package.json’s “>=22.13”, but our suite is only proven green on Node.js 26, my laptop’s version. Claude marked 22 as an assumption, because no file names the version we tested. Change node-version to 26, then a green run on GitHub proves the same thing as my laptop.
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, line 16 sets node-version: 26. Add a comment above it that says: Node.js 26 is the version the suite is proven green on (my laptop runs v26.13.1); package.json allows >=22.13, but we only tested 26. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 1–17):** Lines 3 and 4: run on every push, to any branch. Line 8: the tests run on a fresh Linux computer at GitHub. Lines 10 and 11: copy my repository onto that computer. Lines 13 to 17: install Node.js 26 on it, and the comment says why 26.
- **Packages, browser, tests and the report (lines 18–33):** Lines 19 and 20: install the exact packages from package-lock.json. Lines 22 and 23: install only Chromium, with the system parts it needs. Lines 25 and 26: run all the tests. Lines 28 to 33: save the HTML report from the playwright-report folder on GitHub, so I can download it. Line 29 makes this step run even when a test fails, unless the run was cancelled.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** green tick · **Tests:** 23 passed
- **The report (artifact):** Yes, playwright-report is under Artifacts (217 KB). I downloaded and opened it: it shows 23 tests, 23 passed, 0 failed, in api.spec.ts, comments.spec.ts, contract.spec.ts and the others.

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** The step “Run the Playwright tests” turns red. The test “the API lists the popular tags” fails on line 6: Expected: 201, Received: 200, because GET /api/tags answers 200. The steps before it stay green, and “Keep the HTML report” still runs because of if: !cancelled().
- **What GitHub showed:** The step “Run the Playwright tests” failed. The test “the API lists the popular tags” failed on line 6: Expected: 201, Received: 200. 1 failed, 22 passed. “Keep the HTML report” still ran. My prediction was right.

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** Green tick. 23 passed, 0 failed. I also opened the new report: 23 tests, 23 passed.

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "reading an article by its slug answers 200 with the saved article": **kept**, because it checks exact values and is itself the read-again.
- "deleting an article answers 204 with no body, and the article is gone": **kept**, because 204 with an empty body, then a GET proves the article is gone (404).
- "creating an article without a token answers 401 "is missing"": **changed**, because it checks 401 and the error, but no GET proves nothing was saved. Add a GET of the user’s articles: the list is still empty.
- "creating an article with a wrong token answers 401 "is invalid"": **changed**, because same as 3, add a GET that proves nothing was saved.
- "updating someone else's article answers 403 and does not change it": **changed**, because it reads again but checks only the body. Also check the title, description and tags are unchanged.
- "deleting someone else's article answers 403 and the article stays": **changed**, because it reads again but checks only status 200. Check the title, description, body and tags are unchanged.
- "deleting an article that was already deleted answers 404 "not found"": **kept**, because 204 on the first delete, then 404 with the exact error.

### Tuesday: `tests/contract.spec.ts`
- "GET /api/user answers with the User shape from API.md": **kept**, because 200, exact email and username, the kinds of value, and the exact key list.
- "changing an article with no token answers 401 "is missing" and nothing changes": **kept**, because 401 with the exact error, then a GET shows the whole article is equal to before.
- "changing an article with a wrong token answers 401 "is invalid" and nothing changes": **kept**, because same as 2, for a wrong token.
- "changing someone else's article answers 403 "forbidden" and nothing changes": **kept**, because 403 with the exact error, then a GET shows the whole article is unchanged.
- Note for 2 to 4: they compare before and after, so they would not see a wrong shape (with F2 they stayed green). That is fine, because the Article shape test checks the shape.
