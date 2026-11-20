# Tests from Playwright's agents, and my review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `playwright-test-generator.md`, `playwright-test-healer.md`; `.mcp.json`; `specs/README.md`; `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there. (My first try was in `p4` with a small p: the planner could not open the browser, with "Playwright Test did not expect test.describe() to be called here" on `tests/seed.spec.ts`. In `P4` with a capital P it worked.)

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  ```text
  Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. After the follow, check that the button text changes to “Unfollow practice-author” and that GET /api/profiles/practice-author answers following: true, and undo the follow in test.afterEach.
  ```
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios)
- **The test files the generator wrote:** `tests/profile-follow/signed-out-visitor-sees-profile.spec.ts`, `tests/profile-follow/signed-in-user-follows-author.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says test.afterEach undoes the follow. So we can keep this test in our suite as it is, right?"
- **My answer:** No. The afterEach does undo the follow, but the test uses the shared practice user practice-editor, with the email and password typed in the test. If practice-editor already follows practice-author, line 40 fails. It should make its own new user with the API, give the page the token in localStorage, and use the config’s baseURL, not a fixed address.
- "Signed-in user follows an author and it is undone in afterEach" · **changed**, because it checks something useful: the button text changes and the API answers following: true, and the afterEach undoes it. But it uses the shared user practice-editor and signs in through the form. It must sign up its own user by API, give the page the token, and use the config’s baseURL.
- "Signed-out visitor sees the profile without a follow button" · **changed**, because the useful part is lines 19 and 20: a signed-out visitor sees no Follow or Unfollow button. But it uses the shared user practice-author: line 23 counts 7 articles and line 25 expects one title first, so it breaks when anyone adds an article. It should sign up its own user with its own article by API, open that profile signed out, and check the exact name, bio and article title with toHaveText.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): my two "changed" decisions above, word for word, one for each file.
- **Result:** No fault: 23 passed, 0 failed (my last fault run, with both changed agent tests green).
