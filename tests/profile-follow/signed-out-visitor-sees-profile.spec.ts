// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext } from '@playwright/test';

// Make a new user with the API (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `author${unique}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username, unique };
}

// The article the test made, so test.afterEach can delete it even when a check fails.
let madeArticle: { slug: string; token: string } | null = null;

test.afterEach(async ({ request }) => {
  if (!madeArticle) return;
  const { slug, token } = madeArticle;
  madeArticle = null;
  const response = await request.delete(`/api/articles/${slug}`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.status()).toBe(204);
});

test.describe('Profile and follow', () => {
  test('Signed-out visitor sees the profile without a follow button', async ({ page, request }) => {
    // 1. Make the author, give them a bio (API.md: PUT /api/user -> 200 User)
    //    and one article (API.md: POST /api/articles -> 201 Article), all with the API.
    const { token, username, unique } = await signUp(request);
    const bio = `Bio of ${username}`;
    const updated = await request.put('/api/user', {
      headers: { Authorization: `Token ${token}` },
      data: { user: { bio } },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).user.bio).toBe(bio);

    const title = `Profile article ${unique}`;
    const created = await request.post('/api/articles', {
      headers: { Authorization: `Token ${token}` },
      data: { article: { title, description: `Description ${unique}`, body: `Body text ${unique}` } },
    });
    expect(created.status()).toBe(201);
    madeArticle = { slug: (await created.json()).article.slug as string, token };

    // 2. Open the profile without signing in.
    await page.goto(`/profile/${username}`);

    await expect(page).toHaveTitle(`${username} | Conduit`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(username);
    await expect(page.getByText(bio, { exact: true })).toHaveText(bio);

    const profileNav = page.getByRole('navigation', { name: 'Profile articles' });
    await expect(profileNav.getByRole('link', { name: 'My Articles' })).toBeVisible();
    await expect(profileNav.getByRole('link', { name: 'Favorited Articles' })).toBeVisible();

    await expect(page.getByRole('button', { name: `Follow ${username}` })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Unfollow ${username}` })).toHaveCount(0);

    // 3. Check the article list: only this author's one article.
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText(title);
  });
});
