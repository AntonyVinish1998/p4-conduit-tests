import { test, expect, APIRequestContext } from '@playwright/test';

// Sign up a new user (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `contract${unique}`;
  const email = `${username}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username, email };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

function newArticle() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    title: `Contract test article ${unique}`,
    description: `Description ${unique}`,
    body: `Body text ${unique}`,
    tagList: ['testing', 'api'],
  };
}

async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle() },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article;
}

// Read the article and return it, so a test can compare before and after.
async function readArticle(request: APIRequestContext, slug: string) {
  const response = await request.get(`/api/articles/${slug}`);
  expect(response.status()).toBe(200);
  return (await response.json()).article;
}

// API.md: Article fields, and Profile fields for "author".
const ARTICLE_KEYS = [
  'slug', 'title', 'description', 'body', 'tagList',
  'createdAt', 'updatedAt', 'favorited', 'favoritesCount', 'author',
].sort();
const PROFILE_KEYS = ['username', 'bio', 'image', 'following'].sort();
// API.md: User fields.
const USER_KEYS = ['email', 'token', 'username', 'bio', 'image'].sort();

// ---------- Schema checks ----------

test('GET /api/articles/:slug answers with the Article shape from API.md', async ({ request }) => {
  const { token, username } = await signUp(request);
  const created = await createArticle(request, token);

  const response = await request.get(`/api/articles/${created.slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(Object.keys(json)).toEqual(['article']);
  expect(json).toMatchObject({
    article: {
      slug: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      body: expect.any(String),
      tagList: expect.any(Array),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      favorited: expect.any(Boolean),
      favoritesCount: expect.any(Number),
      author: {
        username,
        // API.md: a new user has bio and image set to null.
        bio: null,
        image: null,
        following: expect.any(Boolean),
      },
    },
  });
  expect(Object.keys(json.article).sort()).toEqual(ARTICLE_KEYS);
  expect(Object.keys(json.article.author).sort()).toEqual(PROFILE_KEYS);
});

test('GET /api/user answers with the User shape from API.md', async ({ request }) => {
  const { token, username, email } = await signUp(request);

  const response = await request.get('/api/user', { headers: auth(token) });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(Object.keys(json)).toEqual(['user']);
  expect(json).toMatchObject({
    user: {
      email,
      token: expect.any(String),
      username,
      // API.md: a new user has bio and image set to null.
      bio: null,
      image: null,
    },
  });
  expect(Object.keys(json.user).sort()).toEqual(USER_KEYS);
});

// ---------- Auth tests ----------

test('changing an article with no token answers 401 "is missing" and nothing changes', async ({ request }) => {
  const { token } = await signUp(request);
  const created = await createArticle(request, token);
  const before = await readArticle(request, created.slug);

  const response = await request.put(`/api/articles/${created.slug}`, {
    data: { article: { body: 'Body changed with no token' } },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });

  const after = await readArticle(request, created.slug);
  expect(after).toEqual(before);
});

test('changing an article with a wrong token answers 401 "is invalid" and nothing changes', async ({ request }) => {
  const { token } = await signUp(request);
  const created = await createArticle(request, token);
  const before = await readArticle(request, created.slug);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: auth('this-is-not-a-real-token'),
    data: { article: { body: 'Body changed with a wrong token' } },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });

  const after = await readArticle(request, created.slug);
  expect(after).toEqual(before);
});

test("changing someone else's article answers 403 \"forbidden\" and nothing changes", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const created = await createArticle(request, author.token);
  const before = await readArticle(request, created.slug);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: auth(other.token),
    data: { article: { body: 'Body changed by another user' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const after = await readArticle(request, created.slug);
  expect(after).toEqual(before);
});
