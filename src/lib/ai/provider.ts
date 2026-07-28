import "server-only";

/**
 * Multi-provider LLM layer.
 *
 * Uruz must not be married to one vendor: the coach can run on Anthropic,
 * OpenAI, Google, a local Ollama/llama.cpp server, or any OpenAI-compatible
 * endpoint (including one with no API key at all, which is the common case for
 * a self-hosted model on the LAN).
 *
 * Everything above this file talks to `chat()` and never knows which provider
 * answered. Selection is pure configuration — see `.env.example`.
 */

export type ProviderName = "anthropic" | "openai" | "google" | "ollama" | "custom" | "none";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  /** Abort the request if the model takes longer than this (ms). */
  timeoutMs?: number;
  /**
   * Ask a reasoning model to skip its hidden chain of thought. Self-hosted
   * llama.cpp-style servers accept this and it is dramatically faster
   * (sub-second instead of ~20s on a 26B model) with no loss for short,
   * well-scoped coaching answers.
   */
  disableThinking?: boolean;
}

export interface AIConfig {
  provider: ProviderName;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  /** Default for ChatOptions.disableThinking on self-hosted providers. */
  disableThinking: boolean;
}

/** Read the active configuration from the environment. */
export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "none").toLowerCase() as ProviderName;
  return {
    provider,
    baseUrl: (process.env.AI_BASE_URL || defaultBaseUrl(provider)).replace(/\/+$/, ""),
    model: process.env.AI_MODEL || "",
    // A local endpoint legitimately has no key — never treat that as an error.
    apiKey: process.env.AI_API_KEY || null,
    disableThinking: process.env.AI_DISABLE_THINKING !== "false",
  };
}

function defaultBaseUrl(provider: ProviderName): string {
  switch (provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "openai":
      return "https://api.openai.com/v1";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta";
    case "ollama":
      return "http://localhost:11434/v1";
    default:
      return "";
  }
}

/** True when a model can actually be reached with the current configuration. */
export function isAIConfigured(config: AIConfig = getAIConfig()): boolean {
  if (config.provider === "none") return false;
  if (!config.model) return false;
  if (!config.baseUrl) return false;
  // Hosted providers need a key; self-hosted ones typically do not.
  const needsKey = config.provider === "anthropic" || config.provider === "openai" || config.provider === "google";
  return needsKey ? !!config.apiKey : true;
}

const DEFAULT_TIMEOUT = 60_000;

export class AIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Send a chat completion and return the assistant's text.
 *
 * Throws `AIError` on failure — callers are expected to fall back to the
 * deterministic, rule-based coaching rather than surfacing an error to a user
 * who just wanted to train.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  config: AIConfig = getAIConfig(),
): Promise<string> {
  if (!isAIConfigured(config)) {
    throw new AIError("AI is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

  try {
    switch (config.provider) {
      case "anthropic":
        return await callAnthropic(messages, options, config, controller.signal);
      case "google":
        return await callGoogle(messages, options, config, controller.signal);
      // OpenAI, Ollama and any custom endpoint all speak the OpenAI chat API.
      default:
        return await callOpenAICompatible(messages, options, config, controller.signal);
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Anthropic -----------------------------------------------------------

async function callAnthropic(
  messages: ChatMessage[],
  options: ChatOptions,
  config: AIConfig,
  signal: AbortSignal,
): Promise<string> {
  // Anthropic takes the system prompt as a top-level field, not a message.
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");

  const res = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) throw new AIError(await errorText(res), res.status);
  const data = await res.json();
  const parts = Array.isArray(data?.content) ? data.content : [];
  return parts
    .filter((p: { type?: string }) => p?.type === "text")
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
}

// ---- OpenAI-compatible (OpenAI, Ollama, llama.cpp, vLLM, custom) ---------

async function callOpenAICompatible(
  messages: ChatMessage[],
  options: ChatOptions,
  config: AIConfig,
  signal: AbortSignal,
): Promise<string> {
  // `chat_template_kwargs` is a llama.cpp/Ollama extension. Hosted OpenAI
  // rejects unknown body fields, so only send it to self-hosted endpoints.
  const selfHosted = config.provider === "custom" || config.provider === "ollama";
  const skipThinking = options.disableThinking ?? config.disableThinking;

  const headers: Record<string, string> = { "content-type": "application/json" };
  // Only send Authorization when a key exists — some local servers reject an
  // empty bearer token outright.
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      model: config.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      ...(selfHosted && skipThinking
        ? { chat_template_kwargs: { enable_thinking: false } }
        : {}),
    }),
  });

  if (!res.ok) throw new AIError(await errorText(res), res.status);
  const data = await res.json();
  const choice = data?.choices?.[0];
  const content = typeof choice?.message?.content === "string" ? choice.message.content : "";
  const answer = stripThinking(content);

  // Reasoning models (Gemma/Qwen/DeepSeek-style) spend tokens on a hidden
  // chain of thought first. If the budget ran out before any answer was
  // produced, say so plainly instead of returning a confusing empty string.
  if (!answer && choice?.message?.reasoning_content) {
    throw new AIError(
      "Model returned only reasoning — increase maxTokens for this model",
      res.status,
    );
  }
  return answer;
}

/**
 * Remove inline chain-of-thought that some models emit in the content itself.
 * Only the final answer should ever reach a user.
 */
function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

// ---- Google Gemini -------------------------------------------------------

async function callGoogle(
  messages: ChatMessage[],
  options: ChatOptions,
  config: AIConfig,
  signal: AbortSignal,
): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
        },
      }),
    },
  );

  if (!res.ok) throw new AIError(await errorText(res), res.status);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
}

async function errorText(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ""}`;
}

/** Lightweight reachability probe, used by the admin panel. */
export async function probeAI(config: AIConfig = getAIConfig()): Promise<{
  ok: boolean;
  provider: ProviderName;
  model: string;
  detail: string;
}> {
  if (!isAIConfigured(config)) {
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      detail: "not_configured",
    };
  }
  try {
    const reply = await chat(
      [
        { role: "system", content: "Svar kun med ordet OK." },
        { role: "user", content: "Er du der?" },
      ],
      // Generous budget: a reasoning model needs room to think before it can
      // answer at all, and a cold local model may also be loading.
      { maxTokens: 1024, temperature: 0, timeoutMs: 120_000 },
      config,
    );
    return {
      ok: reply.length > 0,
      provider: config.provider,
      model: config.model,
      detail: reply.slice(0, 120),
    };
  } catch (err) {
    // Surface the underlying cause: "fetch failed" on its own says nothing
    // about whether it was DNS, a refused connection or a blocked network.
    const cause =
      err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      detail: (err instanceof Error ? err.message : "unknown_error").slice(0, 200) + cause,
    };
  }
}
