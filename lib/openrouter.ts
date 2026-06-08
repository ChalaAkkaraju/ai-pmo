/**
 * OpenRouter client wrapper.
 *
 * OpenRouter exposes an OpenAI-compatible API, so we use the official `openai`
 * npm package configured with OpenRouter's base URL. The model name follows
 * OpenRouter's `<provider>/<model>` format — defaults to anthropic/claude-opus-4-7
 * (matching the Phase 1 lifecycle simulation substrate decision).
 *
 * Server-side only — the OPENROUTER_API_KEY env var must never be exposed
 * to the browser. Always import this from route handlers, server actions,
 * or background scripts; never from client components.
 */

import OpenAI from 'openai';

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-key') {
    throw new Error(
      'OPENROUTER_API_KEY is missing or still the placeholder. ' +
        'Set it in .env.local with your real OpenRouter key (https://openrouter.ai/keys), ' +
        'or set OPENROUTER_BASE_URL to a local OpenAI-compatible endpoint (e.g. Ollama) and use any non-empty key.',
    );
  }

  // OPENROUTER_BASE_URL lets us point at a local OpenAI-compatible server such
  // as Ollama (http://localhost:11434/v1) to generate offline, for free.
  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      // OpenRouter recommends sending Referer + X-Title for attribution.
      'HTTP-Referer': process.env.OPENROUTER_REFERRER ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'pmo-llm-demo',
    },
  });
  return cachedClient;
}

export interface AgentInvocationResult {
  output_md: string;
  /** Estimated input + output token count returned by OpenRouter. */
  tokens_used: number | null;
  /** Estimated dollar cost returned by OpenRouter. */
  cost_usd: number | null;
  /** Model identifier as reported back by OpenRouter (useful for debugging). */
  model: string | null;
}

/**
 * Invoke the configured model with a system prompt + user message.
 *
 * For our use case, the agent prompt is the system message and the assembled
 * context (worked example + project state + user prompt) is the user message.
 */
export async function invokeModel({
  systemPrompt,
  userMessage,
}: {
  systemPrompt: string;
  userMessage: string;
}): Promise<AgentInvocationResult> {
  const client = getClient();
  const model = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-opus-4-7';

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    // No temperature override; let OpenRouter / Anthropic default apply.
    // No streaming for MVP — Phase 2.5 polish can add it.
  });

  const choice = response.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error(
      `OpenRouter returned no content. Full response: ${JSON.stringify(response)}`,
    );
  }

  const output_md = choice.message.content;

  // OpenRouter returns usage in the OpenAI format plus a `usage.cost` field
  // (non-standard extension) when available.
  const usage = response.usage as
    | (typeof response.usage & { cost?: number })
    | undefined;
  const tokens_used =
    typeof usage?.total_tokens === 'number' ? usage.total_tokens : null;
  const cost_usd = typeof usage?.cost === 'number' ? usage.cost : null;

  return {
    output_md,
    tokens_used,
    cost_usd,
    model: response.model ?? model,
  };
}
