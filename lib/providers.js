export class ResearchError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export class ProviderError extends ResearchError {
  constructor(provider, status) {
    const details = {
      400: "rejected the request.",
      401: "could not authenticate its API key.",
      402: "has insufficient credits.",
      403: "did not grant access to this endpoint or field.",
      429: "reached its rate or usage limit.",
      504: "timed out."
    };
    super(provider + " " + (details[status] ?? "is temporarily unavailable."), status);
  }
}

async function post(provider, url, headers, data, signal, timeout) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(data),
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)])
    });
  } catch (error) {
    signal.throwIfAborted();
    throw new ProviderError(provider, error.name === "TimeoutError" ? 504 : 502);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderError(provider, response.status);
  }
  return response.json();
}

export async function openai(name, instructions, input, schema, signal) {
  const response = await post(
    "OpenAI",
    "https://api.openai.com/v1/responses",
    { Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    {
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini",
      store: false,
      instructions,
      input: JSON.stringify(input),
      max_output_tokens: name === "research_plan" ? 1400 : 3800,
      text: { format: { type: "json_schema", name, strict: true, schema } }
    },
    signal,
    35_000
  );
  const parts = (response.output ?? [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content ?? []);
  if (parts.some(item => item.type === "refusal")) {
    throw new ResearchError("The model could not prepare a brief for this question. Try rephrasing it.");
  }
  const text = parts.filter(item => item.type === "output_text").map(item => item.text).join("");
  if (response.status !== "completed" || !text) {
    throw new ResearchError("OpenAI returned an incomplete brief. Try a narrower question.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ResearchError("OpenAI returned a brief that could not be read. Try again.");
  }
}

export function crust(path, body, signal) {
  return post("Crustdata", "https://api.crustdata.com" + path, {
    Authorization: "Bearer " + process.env.CRUSTDATA_API_KEY,
    "X-API-Version": "2025-11-01"
  }, body, signal, 16_000);
}

export const list = value => Array.isArray(value) ? value : [];
export const clean = (value, limit = 200) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export function safeUrl(value) {
  try {
    const url = new URL(value);
    if (/^https?:$/.test(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
    // Provider records occasionally have blank or malformed URLs.
  }
  return "";
}
