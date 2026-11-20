// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext, Page } from '@playwright/test';

// Make a new user with the API (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext, prefix: string) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `${prefix}${unique}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username };
}

// Give the page the token: the page reads it from localStorage, key jwtToken.
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => window.localStorage.setItem('jwtToken', t), token);
}

test.describe('Profile and follow', () => {
  let follower: { token: string; username: string } | null = null;
  let author: { token: string; username: string } | null = null;

  test.afterEach(async ({ request }) => {
    // Undo the follow (API.md: DELETE /api/profiles/:username/follow -> 200 Profile).
    if (!follower || !author) return;
    const { token } = follower;
    const { username } = author;
    follower = null;
    author = null;
    const res = await request.delete(`/api/profiles/${username}/follow`, {
      headers: { Authorization: `Token ${token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).profile.following).toBe(false);
  });

  test('Signed-in user follows an author and it is undone in afterEach', async ({ page, request }) => {
    // 1. Make the author and the follower with the API, give the page the follower's token,
    //    then open the author's profile.
    author = await signUp(request, 'author');
    follower = await signUp(request, 'follower');
    await signInPage(page, follower.token);
    await page.goto(`/profile/${author.username}`);
    // exact: true because "Unfollow <name>" also contains "follow <name>"
    const followButton = page.getByRole('button', { name: `Follow ${author.username}`, exact: true });
    await expect(followButton).toBeVisible();

    // 2. Click the Follow button.
    await followButton.click();
    await expect(page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true })).toBeVisible();

    // 3. Call GET /api/profiles/:username with the follower's token.
    const res = await request.get(`/api/profiles/${author.username}`, {
      headers: { Authorization: `Token ${follower.token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).profile.following).toBe(true);
  });
});
