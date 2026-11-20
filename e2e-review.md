# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-20

## 1. My first look
- **After I published an article by hand, I would check:** At the end, I would check that the Global Feed shows my article with the exact title I typed, “My first journey test”, by the user who wrote it. Then I would open it and check the title, description and body. I could also check it through the API with GET /api/articles/<slug>, to be sure it was really saved.
- **Where the page keeps my sign-in:** The key is jwtToken.

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. The heading is visible before the click too, so the check passes even if the like did nothing. It should check something that changes: the button now says Unfavorite Article, and the API answer has favorited true and favoritesCount one higher.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end, read the result with the API and check the exact values the test typed, for example the article’s title, description and body, or the comment’s text and author, using the slug or id from the test’s own data.
```

## 4. The run
- **Claude's 2 tests:** `npx playwright test tests/e2e.spec.ts` → 2 tests: 2 passed, 0 failed. No test failed.

## 5. The teammate's question
- **Claude said:** each test makes its own user and data. The teammate asked: "Both tests are green. Claude says each test makes its own user and data. So the app is clean after a run, right?"
- **My answer:** No. Each test makes its own user and article, but nothing deletes them. This run used the app in the APP terminal, so they stay there, and the Global Feed grows after every run. The test should delete its article with DELETE /api/articles/<slug> at the end, for example in an afterEach.

## 6. What I saw on the home page
- At the top I see “E2E comment article 179514669484563857” and “E2E article 179514669392680985”, by new e2e users. They come from Claude’s tests. Below them is my own “My first journey test”. Nothing deleted the test data.

## 7. My change
- **My line to Claude:** In @P4/tests/e2e.spec.ts, both tests leave the articles they made: the publish test leaves its new article, and the comment test leaves its article and comment. Delete each article the test made with DELETE /api/articles/:slug in test.afterEach, using the slug and token from the test's own data, so it runs even when a check fails. Change nothing else. Do not run the tests.
- **The clean-up Claude added:** a `test.afterEach` (lines 23–31) deletes the article each test made with `DELETE /api/articles/<slug>` and the test's own token, and checks 204. Each test saves its slug right after it makes the article (lines 50 and 81).

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 tests: 4 passed, 0 failed.
- **The newest article on the home page after the run:** Your first end-to-end test
