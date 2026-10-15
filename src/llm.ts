import { msg } from "./messages.js";

export type LlmProvider = "anthropic" | "openai";

export interface GenerateResult {
  provider: LlmProvider;
  source: string;
}

function detectProvider(): LlmProvider | null {
  const forced = process.env.DOLLY_LLM_PROVIDER?.toLowerCase();
  if (forced === "anthropic" || forced === "openai") {
    if (forced === "anthropic" && !process.env.ANTHROPIC_API_KEY) return null;
    if (forced === "openai" && !process.env.OPENAI_API_KEY) return null;
    return forced;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

const SYSTEM_PROMPT = `You are Dolly, a code generator that writes small standalone C programs for Android (aarch64-linux-android), run via adb shell from /data/local/tmp.

Rules:
- Output ONLY valid C source code. No markdown fences, no explanations.
- Single file: #include what you need, int main(...).
- Prefer stdio/stdlib only. No GUI, no JNI, no Android SDK APIs.
- Print useful output to stdout. Exit 0 on success.
- Keep programs short and correct. User may write in Portuguese or English.
- If the request is unclear, write a small program that prints a clarifying message.`;

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:c|C)?\s*\n?/, "");
    t = t.replace(/\n?```\s*$/, "");
  }
  return t.trim() + "\n";
}

async function generateAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model =
    process.env.DOLLY_ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${body}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content
    ?.filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
  if (!text) throw new Error("Anthropic response had no text content");
  return stripCodeFences(text);
}

async function generateOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.DOLLY_OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${body}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI response had no content");
  return stripCodeFences(text);
}

export async function generateC(prompt: string): Promise<GenerateResult> {
  const provider = detectProvider();
  if (!provider) {
    throw new Error(msg.noApiKey());
  }
  try {
    const source =
      provider === "anthropic"
        ? await generateAnthropic(prompt)
        : await generateOpenAI(prompt);
    return { provider, source };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(msg.llmFailed(detail));
  }
}
