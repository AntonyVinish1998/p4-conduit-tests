# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- The line that sent my comment used POST, and the status was 201 Created. The other comments line used GET, with 200 OK, and loaded all the comments again, including mine.

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201, the body has the comment with “body”: “Clear and useful.” and the author practice-reader. The app answered 201, with the comment: body "Clear and useful.", author practice-reader.
- **B** (the same comment, with no token): I predicted 401, errors: token is missing. The app answered 401, `{"errors":{"token":["is missing"]}}`.
- **C** (a comment on an article that does not exist): I predicted 404, errors: article not found. The app answered 404, `{"errors":{"article":["not found"]}}`.
- **What surprised me:** A surprised me a little: the new comment got id 5 again, even though I deleted comment 5 before. I think it is because Playwright started its own copy of the app with fresh data, so the ids start again from the same point.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check the exact status and the body fields API.md promises, with exact values, and use the slug or id from the test’s own answer, never a fixed one.
```

## 4. The run
- **Result:** 10 tests: 9 passed, 1 failed.
- **A red test, and who is wrong** (only if a test failed):
  - Test: "updating only the body changes the body and keeps the other fields"
  - Expected: `["testing", "api"]` · Received: `[]`
  - API.md says: "Updating: every field is optional. A field you do not send stays as it was."
  - My answer: The app is wrong. API.md says a field you do not send stays as it was. The test sent only the body, so the tags should stay [‘testing’, ‘api’]. The app returned [], so it removed the tags. Keep the test as it is, and report a bug.
- **My note** (only if I kept a red test with `test.fail()`): Known app bug: updating only the body removes the tags. API.md says fields not sent stay as they were.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "creating an article without a title answers 422 "can't be blank""
- **My answer:** No. The test only checks the answer: 422 and the message. It does not check that nothing was saved. The test should also send a GET, for example the user’s articles, and check that the list is still empty.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "creating an article answers 201 with the article that was sent"
- **My decision:** Change it. It checks 201 and exact values in the answer, and it makes its own user. But it only checks what the app said. Add a GET /api/articles/<slug from the answer> and check that the title, description, body and tags are the same, to prove the article was saved.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. After a request that creates or changes data, the test reads it again with a GET and checks the exact values.
2. After a refused request, the test reads the data again with a GET and checks that nothing changed.
3. Every check uses the exact status and exact body values from API.md, and the slug or id from the test’s own answer, never a fixed one.
