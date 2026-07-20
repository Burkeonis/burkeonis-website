import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import { analyseWithWorkersAI } from './services/ai';

type Bindings = {
  AI: Ai;
  DB: D1Database;
  SESSION_STORE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.use('*', secureHeaders());

const analysisSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  mode: z.enum(['mirror', 'mediator', 'abyss']).default('mirror'),
});

const rewriteSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  tone: z
    .enum(['clear', 'calm', 'direct', 'empathetic', 'firm'])
    .default('clear'),
});

function jsonError(message: string, status = 400) {
  return {
    error: true,
    message,
    status,
  };
}

app.get('/', (c) => {
  return c.json({
    service: 'Self Mirror API',
    status: 'online',
    version: '0.1.0',
  });
});

app.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();

    return c.json({
      ok: true,
      service: 'rad-mirror',
      bindings: {
        ai: true,
        database: true,
        sessionStore: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return c.json(
      jsonError('The database binding could not be reached.', 503),
      503,
    );
  }
});

app.post('/analyse', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = analysisSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          ...jsonError('Invalid analysis request.'),
          issues: parsed.error.flatten(),
        },
        400,
      );
    }

    const { text, mode } = parsed.data;

    const analysis = await analyseWithWorkersAI(
      c.env,
      text,
      mode,
    );

    return c.json({
      ok: true,
      endpoint: 'analyse',
      mode,
      input: text,
      analysis,
    });
  } catch (error) {
    console.error('Analysis request failed:', error);

    return c.json(
      jsonError('Unable to process the analysis request.', 500),
      500,
    );
  }
});

app.post('/rewrite', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = rewriteSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          ...jsonError('Invalid rewrite request.'),
          issues: parsed.error.flatten(),
        },
        400,
      );
    }

    const { text, tone } = parsed.data;

    return c.json({
      ok: true,
      endpoint: 'rewrite',
      tone,
      original: text,
      rewritten: text,
      message:
        'The rewrite endpoint is connected. Workers AI will be added in the next step.',
    });
  } catch (error) {
    console.error('Rewrite request failed:', error);

    return c.json(
      jsonError('Unable to process the rewrite request.', 500),
      500,
    );
  }
});

app.notFound((c) => {
  return c.json(jsonError('Route not found.', 404), 404);
});

app.onError((error, c) => {
  console.error('Unhandled Worker error:', error);

  return c.json(
    jsonError('Internal server error.', 500),
    500,
  );
});

export default app;