# Profile page and follow author

## Application Overview

Conduit practice app at http://127.0.0.1:3000. Start page /profile/practice-author. Signed-in steps use practice-editor (practice-editor@example.com / Practice123 from README.md). practice-reader is NOT used for follow because it already follows practice-author in fresh data (seen via GET /api/profiles/practice-author). Follow button name when not following is ASSUMPTION: "Follow practice-author" (only "Unfollow practice-author" was seen on the page). Auth for API: POST /api/users/login with {"user":{"email","password"}} returns user.token; send header "Authorization: Token <token>" (API.md). Locators per project rules: getByRole first (button, textbox, heading, link).

## Test Scenarios

### 1. Profile page

**Seed:** `tests/seed.spec.ts`

#### 1.1. Signed-out visitor sees the profile without a follow button

**File:** `tests/profile-follow/profile-view.spec.ts`

**Steps:**
  1. Open /profile/practice-author without signing in.
    - expect: Page title is 'practice-author | Conduit'.
    - expect: Heading level 1 'practice-author' is visible, with the text 'I write about testing and quality.'
    - expect: Links 'My Articles' and 'Favorited Articles' are visible in the navigation 'Profile articles'.
    - expect: No button named 'Follow practice-author' or 'Unfollow practice-author' is shown.
  2. Check the article list.
    - expect: 7 articles are listed, first one is the heading 'Your first end-to-end test' (ASSUMPTION: count and order are fixed in fresh data).

#### 1.2. Signed-in user follows an author and it is undone in afterEach

**File:** `tests/profile-follow/follow-author.spec.ts`

**Steps:**
  1. Sign in as practice-editor on /login (textbox 'Email', textbox 'Password', button 'Sign in'), then open /profile/practice-author.
    - expect: Button 'Follow practice-author' is visible (ASSUMPTION on exact text).
  2. Click the button 'Follow practice-author'.
    - expect: The button text changes to 'Unfollow practice-author'.
  3. Call GET http://127.0.0.1:3000/api/profiles/practice-author with header Authorization: Token <practice-editor token> (token from POST /api/users/login).
    - expect: Status 200 and body profile.following is true.
  4. Reload the page.
    - expect: Button 'Unfollow practice-author' is still shown.
  5. test.afterEach: send DELETE /api/profiles/practice-author/follow with the same token to undo the follow, then check GET shows following false.
    - expect: DELETE answers 200 and profile.following is false, so the next run starts clean.
