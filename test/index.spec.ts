import { describe, expect, it } from 'vitest';
import app from '../src/index';

describe('Self Mirror API', () => {
  it('returns API information from the root route', async () => {
    const response = await app.request('/');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: 'Self Mirror API',
      status: 'online',
      version: '0.1.0',
    });
  });

  it('accepts a valid analysis request', async () => {
    const response = await app.request('/analyse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'I keep saying I want change, but I avoid taking action.',
        mode: 'mirror',
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      endpoint: 'analyse',
      mode: 'mirror',
    });
  });

  it('rejects an empty analysis request', async () => {
    const response = await app.request('/analyse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: '',
        mode: 'mirror',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown route', async () => {
    const response = await app.request('/does-not-exist');

    expect(response.status).toBe(404);
  });
});
