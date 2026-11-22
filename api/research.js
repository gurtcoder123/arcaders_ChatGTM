import { research, ResearchError, mode } from "../lib/research.js";
import { examples, lenses } from "../public/examples.js";
import { sampleReport } from "../lib/sample.js";

const headers = { "Cache-Control": "no-store" };
const json = (data, status = 200, extra = {}) =>
  Response.json(data, { status, headers: { ...headers, ...extra } });

async function parseInput(request) {
  if (!request.headers.get("content-type")?.match(/^application\/json\b/i)) {
    throw new ResearchError("Send an application/json request.", 415);
  }
  if (request.headers.has("origin") && request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ResearchError("Open ChatGTM to create a brief.", 403);
  }
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 12_000) {
          await reader.cancel();
          throw new ResearchError("The research request is too large.", 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ResearchError("The research request could not be read.", 400);
  }
  const query = typeof data?.query === "string" ? data.query.trim() : "";
  if (query.length < 3 || query.length > 2000 || !lenses.some(lens => lens.id === data?.lens)) {
    throw new ResearchError("Enter a question between 3 and 2,000 characters and select a research lens.", 400);
  }
  return { query, lens: data.lens, example: examples.find(item => item.query === query) };
}

async function handle(request) {
  if (request.method === "GET") return json({ mode: mode() });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });

  let input;
  try {
    input = await parseInput(request);
  } catch (error) {
    return json({ error: error instanceof ResearchError ? error.message : "The request could not be read." }, error.status ?? 400);
  }
  const isSample = mode() === "sample";
  if (isSample && !input.example) {
    return json({ error: "Live research needs both API keys. Select an example to open a sample brief." }, 503);
  }

  const task = new AbortController();
  const signal = AbortSignal.any([request.signal, task.signal, AbortSignal.timeout(78_000)]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = data => {
        if (!task.signal.aborted && !request.signal.aborted) {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        }
      };
      try {
        const progress = stage => send({ type: "progress", stage });
        const report = isSample ? sampleReport(input.example.id) : await research(input, signal, progress);
        send({ type: "report", report });
      } catch (error) {
        let message = "The brief could not be generated. Try again or narrow the question.";
        if (error instanceof ResearchError) message = error.message;
        else if (signal.aborted) message = "The research request timed out. Try a narrower question.";
        else console.error("Research failed:", error.name);
        send({ type: "error", error: message });
      } finally {
        if (!task.signal.aborted && !request.signal.aborted) controller.close();
      }
    },
    cancel() {
      task.abort();
    }
  });
  return new Response(stream, {
    headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Content-Type-Options": "nosniff" }
  });
}

export default { fetch: handle };
