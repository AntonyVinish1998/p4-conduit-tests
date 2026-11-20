import { test, expect, APIRequestContext } from '@playwright/test';

// Make a new user with the API (API.md: POST /api/users -> 201 User).
async function signUp(request: APIRequestContext) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `comments${unique}`;
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { token: json.user.token as string, username, unique };
}

// Make an article with the API (API.md: POST /api/articles -> 201 Article).
async function makeArticle(request: APIRequestContext, token: string, unique: string) {
  const created = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: {
      article: {
        title: `Comments article ${unique}`,
        description: `Description ${unique}`,
        body: `Body text ${unique}`,
      },
    },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).article.slug as string;
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

test.describe('Comments API', () => {
  test('a new user posts a comment on their own new article', async ({ request }) => {
    const { token, username, unique } = await signUp(request);
    const slug = await makeArticle(request, token, unique);
    madeArticle = { slug, token };
    const commentText = `API comment ${unique}`;

    // API.md: POST /api/articles/:slug/comments -> 201 {"comment":{...}}
    const posted = await request.post(`/api/articles/${slug}/comments`, {
      headers: { Authorization: `Token ${token}` },
      data: { comment: { body: commentText } },
    });
    expect(posted.status()).toBe(201);
    const postedJson = await posted.json();
    expect(postedJson.comment.body).toBe(commentText);
    expect(postedJson.comment.author.username).toBe(username);

    // API.md: GET /api/articles/:slug/comments -> 200 {"comments":[...]}
    const listed = await request.get(`/api/articles/${slug}/comments`);
    expect(listed.status()).toBe(200);
    const listedJson = await listed.json();
    expect(listedJson.comments).toHaveLength(1);
    expect(listedJson.comments[0].body).toBe(commentText);
    expect(listedJson.comments[0].author.username).toBe(username);
  });

  test('posting a comment with an empty body is refused with 422', async ({ request }) => {
    // Known app bug: API.md says an empty comment body gives 422 "can't be blank",
    // but the app answers 201 and saves the comment. test.fail() marks this test as
    // expected to fail; remove it when the app is fixed.
    test.fail();
    const { token, unique } = await signUp(request);
    const slug = await makeArticle(request, token, unique);
    madeArticle = { slug, token };

    const before = await request.get(`/api/articles/${slug}/comments`);
    expect(before.status()).toBe(200);
    const beforeComments = (await before.json()).comments;
    expect(beforeComments).toEqual([]);

    // API.md: body required; 422 when a field is missing or not valid.
    const posted = await request.post(`/api/articles/${slug}/comments`, {
      headers: { Authorization: `Token ${token}` },
      data: { comment: { body: '' } },
    });
    expect(posted.status()).toBe(422);
    // API.md Errors table, 422 example body.
    expect(await posted.json()).toEqual({ errors: { body: ["can't be blank"] } });

    const after = await request.get(`/api/articles/${slug}/comments`);
    expect(after.status()).toBe(200);
    expect((await after.json()).comments).toEqual(beforeComments);
  });
});
