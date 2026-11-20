# My practice fault report (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-20
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** Green only shows the checks pass, not what they catch. I know two cases: the contract test caught F2 (body missing), and api.spec.ts caught the bug where updating the body removes the tags. To find out more, I would switch on each practice fault one at a time and count how many turn at least one test red.

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/signed-in-user-follows-author.spec.ts`, `profile-follow/signed-out-visitor-sees-profile.spec.ts`, `seed.spec.ts`
- **No fault:** 21 passed, 0 failed
- **F1:** caught (10 tests failed)
- **F2:** caught (4 tests failed)
- **F3:** caught (2 tests failed)
- **F4:** caught (1 test failed: the e2e comment test)
- **F5:** stayed green
- **F6:** caught (1 test failed: the e2e comment test)

## 3. The weak spot I chose, and why
Comments are the weakest. F4 and F6 were each caught by only one test, the e2e comment test. My API and contract tests only cover articles. A good suite should catch F4 with an API test too: post a comment, then GET the comments and check the exact text is in the list.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Only one test checks comments. Write P4/tests/comments.spec.ts with 2 API tests. Test 1: a new user posts a comment on their own new article; the answer is 201 with the exact comment text and author, and a GET of the comments shows the same text and author. Test 2: posting a comment with an empty body is refused with 422, and a GET of the comments shows the list did not change. Each test makes its own user and article by API and deletes the article in test.afterEach.
- **New or changed test file:** `tests/comments.spec.ts` (new, 2 tests)
- **A red test with no fault:** "posting a comment with an empty body is refused with 422" failed with no fault (Expected 422, Received 201). My answer: The app is wrong. API.md line 104 says the comment body is required, and line 33 gives 422 with “can’t be blank” as the example. The test sent an empty body and expected 422, but the app answered 201, so it saved an empty comment. Keep the test, mark it with test.fail and a note, and report a bug.

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 23 passed, 0 failed
- **The fault I chose:** F4: caught by 2 tests (the new API comment test and the e2e comment test) · F6: caught by the same 2 tests (the `test.fail()` test passed with F6: not a catch)

## 6. What changed
The suite is stronger now. With no fault, 23 tests pass, 2 more than before. F4 and F6 are now each caught by 2 tests, not 1: the e2e comment test and my new API comment test. So if one of them breaks, the other still catches the fault. The new test also found a real bug: the app saves a comment with an empty body.
