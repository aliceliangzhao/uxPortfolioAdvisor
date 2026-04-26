/**
 * Multi-provider LLM client.
 * Auto-detects which provider to use based on which API key is set in .env.
 * Priority: Anthropic > OpenAI > Google Gemini > OpenRouter > AWS Bedrock
 */

type Provider = "anthropic" | "openai" | "gemini" | "openrouter" | "bedrock";

interface ProviderConfig {
  name: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
  authHeader: (key: string) => Record<string, string>;
}

function detectProvider(): ProviderConfig {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-4-20250514",
      authHeader: (key) => ({
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      }),
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      name: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
      model: "gemini-2.0-flash",
      authHeader: () => ({}), // Gemini uses query param
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      model: "anthropic/claude-sonnet-4",
      authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    };
  }

  if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
    return {
      name: "bedrock",
      apiKey: process.env.AWS_BEARER_TOKEN_BEDROCK,
      baseUrl: "", // handled by SDK
      model: "us.anthropic.claude-opus-4-6-v1",
      authHeader: () => ({}),
    };
  }

  throw new Error(
    "No LLM API key found. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or AWS_BEARER_TOKEN_BEDROCK in your .env file."
  );
}

/**
 * Unified generate function — routes to the right provider automatically.
 */
export async function generate(
  systemPrompt: string,
  userMessage: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const provider = detectProvider();
  const { maxTokens = 8096 } = options;

  console.log(`[LLM] Using ${provider.name} (${provider.model})`);

  switch (provider.name) {
    case "anthropic":
      return callAnthropic(provider, systemPrompt, userMessage, maxTokens);
    case "openai":
    case "openrouter":
      return callOpenAICompatible(provider, systemPrompt, userMessage, maxTokens);
    case "gemini":
      return callGemini(provider, systemPrompt, userMessage, maxTokens);
    case "bedrock":
      return callBedrock(systemPrompt, userMessage, maxTokens);
  }
}

async function callAnthropic(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(provider.apiKey),
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("No text in Anthropic response");
  return textBlock.text;
}

async function callOpenAICompatible(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(provider.apiKey),
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${provider.name} API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  if (!data.choices?.[0]?.message?.content) {
    throw new Error(`No content in ${provider.name} response`);
  }
  return data.choices[0].message.content;
}

async function callGemini(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const url = `${provider.baseUrl}/${provider.model}:generateContent?key=${provider.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in Gemini response");
  return text;
}

async function callBedrock(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  // Dynamic import to avoid requiring AWS SDK when not using Bedrock
  const { BedrockRuntimeClient, ConverseStreamCommand } = await import(
    "@aws-sdk/client-bedrock-runtime"
  );

  const region = process.env.AWS_REGION || "us-east-1";
  const client = new BedrockRuntimeClient({ region });

  const command = new ConverseStreamCommand({
    modelId: "us.anthropic.claude-opus-4-6-v1",
    messages: [{ role: "user", content: [{ text: userMessage }] }],
    system: [{ text: systemPrompt }],
    inferenceConfig: { maxTokens },
  });

  const response = await client.send(command);
  let fullText = "";

  if (response.stream) {
    for await (const chunk of response.stream) {
      if (chunk.contentBlockDelta?.delta?.text) {
        fullText += chunk.contentBlockDelta.delta.text;
      }
    }
  }

  if (!fullText) throw new Error("No text response from Bedrock");
  return fullText;
}
