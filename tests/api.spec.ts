import { test, expect, APIRequestContext } from '@playwright/test';

// Sign up a new user and return the token and username (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `writer${unique}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

function newArticle() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    title: `API test article ${unique}`,
    description: `Description ${unique}`,
    body: `Body text ${unique}`,
    tagList: ['testing', 'api'],
  };
}

async function createArticle(request: APIRequestContext, token: string, article = newArticle()) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ---------- Positive tests ----------

test('creating an article answers 201 with the article that was sent', async ({ request }) => {
  const { token, username } = await signUp(request);
  const article = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(typeof json.article.slug).toBe('string');
  expect(json.article.slug).not.toBe('');
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(['testing', 'api']);
  expect(json.article.createdAt).toMatch(ISO_DATE);
  expect(json.article.updatedAt).toMatch(ISO_DATE);
  expect(json.article.author.username).toBe(username);
  expect(json.article.author.bio).toBeNull();
  expect(json.article.author.image).toBeNull();
});

test('reading an article by its slug answers 200 with the saved article', async ({ request }) => {
  const { token, username } = await signUp(request);
  const article = newArticle();
  const created = await createArticle(request, token, article);

  const response = await request.get(`/api/articles/${created.slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(created.slug);
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(['testing', 'api']);
  expect(json.article.createdAt).toBe(created.createdAt);
  expect(json.article.author.username).toBe(username);
});

test('updating only the body changes the body and keeps the other fields', async ({ request }) => {
  // Known app bug: updating only the body removes the tags. API.md says fields not sent stay as they were.
  test.fail();
  const { token } = await signUp(request);
  const article = newArticle();
  const created = await createArticle(request, token, article);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: auth(token),
    data: { article: { body: 'Changed body text' } },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.body).toBe('Changed body text');
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.tagList).toEqual(['testing', 'api']);

  // The change is saved: read it back with the slug from the update answer.
  const read = await request.get(`/api/articles/${json.article.slug}`);
  expect(read.status()).toBe(200);
  const readJson = await read.json();
  expect(readJson.article.body).toBe('Changed body text');
  expect(readJson.article.title).toBe(article.title);
});

test('deleting an article answers 204 with no body, and the article is gone', async ({ request }) => {
  const { token } = await signUp(request);
  const created = await createArticle(request, token);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: auth(token),
  });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe('');

  const read = await request.get(`/api/articles/${created.slug}`);
  expect(read.status()).toBe(404);
  expect(await read.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('creating an article without a title answers 422 "can\'t be blank"', async ({ request }) => {
  const { token } = await signUp(request);
  const { description, body, tagList } = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: { description, body, tagList } },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
});

test('creating an article without a token answers 401 "is missing"', async ({ request }) => {
  const response = await request.post('/api/articles', {
    data: { article: newArticle() },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('creating an article with a wrong token answers 401 "is invalid"', async ({ request }) => {
  const response = await request.post('/api/articles', {
    headers: auth('this-is-not-a-real-token'),
    data: { article: newArticle() },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});

test("updating someone else's article answers 403 and does not change it", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const article = newArticle();
  const created = await createArticle(request, author.token, article);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: auth(other.token),
    data: { article: { body: 'Body changed by another user' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const read = await request.get(`/api/articles/${created.slug}`);
  expect(read.status()).toBe(200);
  expect((await read.json()).article.body).toBe(article.body);
});

test("deleting someone else's article answers 403 and the article stays", async ({ request }) => {
  const author = await signUp(request);
  const other = await signUp(request);
  const created = await createArticle(request, author.token);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: auth(other.token),
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const read = await request.get(`/api/articles/${created.slug}`);
  expect(read.status()).toBe(200);
});

test('deleting an article that was already deleted answers 404 "not found"', async ({ request }) => {
  const { token } = await signUp(request);
  const created = await createArticle(request, token);
  const first = await request.delete(`/api/articles/${created.slug}`, { headers: auth(token) });
  expect(first.status()).toBe(204);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: auth(token),
  });

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});
