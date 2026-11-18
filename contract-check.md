# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-18

## 1. My first look
How I would check that an article answer has the right shape: The test checks that every key API.md lists is there: slug, title, description, body, tagList, createdAt, updatedAt, favorited, favoritesCount and author. It also checks each type: text for title, a list for tagList, true or false for favorited, a number for favoritesCount, and an author with a username.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** missing: fails, because bio is not in the keys any more. new field: fails, because password is an extra key. number: passes, because the key list only checks the names, not the kind of value.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Every schema check also compares the exact key list with Object.keys().sort() and toEqual, and every refused auth request is followed by a GET that shows nothing changed.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 tests: 5 passed, 0 failed.
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
My own article test already had an exact key list (lines 87–88), so I looked at a test from another run.
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape" (toMatchObject only)
- **Claude said:** "an anonymous reader gets 200 and the full Article shape."
- **My answer:** No, it stays green. toMatchObject only checks the fields it lists, so a new field like password is not seen. The test needs an exact key list check too: Object.keys(json.article).sort() with toEqual and the keys from API.md.

## 6. My change
- **What I asked Claude:** My file already had exact key lists (lines 87, 88, 109) because of my rule, so no change was needed. My line for the test from the other run: "In @P4/tests/contract.spec.ts, the test “GET /api/articles/:slug answers with the Article shape” lets in extra fields. Add a check that the article has exactly the keys in API.md, with Object.keys(json.article).sort() and toEqual. Do not run the tests."
- **The run after it:** 5 passed, 0 failed (no change to the file).

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** Test 1, “GET /api/articles/:slug answers with the Article shape”, will fail. Its key list check (line 87) compares the exact keys from API.md, so a missing field breaks it. Tests 3, 4 and 5 read the article again with a GET too, so one of them may fail if it checks the field that is gone. Test 2 is about the user, so it stays green.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 4 passed, 1 failed: "GET /api/articles/:slug answers with the Article shape from API.md" (at its toMatchObject, line 67).
- **What Playwright showed:** `- Expected - 1` / `+ Received + 0`, with the line `-     "body": Any<String>,`
- **My answer about a red test:** The fault took away the body field. I see it in the diff: the line “body”: Any<String> has a minus (-), so it was expected but not received. The answer has no body.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed.
