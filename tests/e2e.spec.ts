import { test, expect, APIRequestContext, Page } from '@playwright/test';

// Make a new user with the API (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `e2e${unique}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username, unique };
}

// Give the page the token: the page reads it from localStorage, key jwtToken.
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => window.localStorage.setItem('jwtToken', t), token);
}

// The article each test made, so test.afterEach can delete it even when a check fails.
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

test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
  const { token, username, unique } = await signUp(request);
  await signInPage(page, token);
  const title = `E2E article ${unique}`;
  const description = `E2E description ${unique}`;
  const body = `E2E body text ${unique}`;

  await page.goto('/editor');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: "What's this article about?", exact: true }).fill(description);
  await page.getByRole('textbox', { name: 'Write your article', exact: true }).fill(body);
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('testing, e2e');
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // The page opens the new article; its slug is in the address.
  await page.waitForURL(/\/article\/[^/]+$/);
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2]);
  madeArticle = { slug, token };
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  // Check the result with the API.
  const response = await request.get(`/api/articles/${slug}`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(title);
  expect(json.article.description).toBe(description);
  expect(json.article.body).toBe(body);
  expect(json.article.tagList).toEqual(['testing', 'e2e']);
  expect(json.article.author.username).toBe(username);
});

test('a signed-in user posts a comment on an article', async ({ page, request }) => {
  const { token, username, unique } = await signUp(request);

  // The article to comment on, made with the API.
  const created = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: {
      article: {
        title: `E2E comment article ${unique}`,
        description: `Description ${unique}`,
        body: `Body text ${unique}`,
      },
    },
  });
  expect(created.status()).toBe(201);
  const slug = (await created.json()).article.slug as string;
  madeArticle = { slug, token };
  const commentText = `E2E comment ${unique}`;

  await signInPage(page, token);
  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await page.getByRole('textbox', { name: 'Write a comment', exact: true }).fill(commentText);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  // The page shows the new comment.
  await expect(page.getByText(commentText, { exact: true })).toBeVisible();

  // Check the result with the API.
  const response = await request.get(`/api/articles/${slug}/comments`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.comments).toHaveLength(1);
  expect(json.comments[0].body).toBe(commentText);
  expect(json.comments[0].author.username).toBe(username);
});
