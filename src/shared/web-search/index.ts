/**
 * Multi-provider web search client.
 * Auto-detects which provider to use based on which API key is set in .env.
 * Priority: Tavily > Brave > Serper > SerpAPI > Exa
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

type SearchProvider = "tavily" | "brave" | "serper" | "serpapi" | "exa";

function detectProvider(): { name: SearchProvider; apiKey: string } | null {
  if (process.env.EXA_API_KEY) {
    return { name: "exa", apiKey: process.env.EXA_API_KEY };
  }
  if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== "your-tavily-api-key") {
    return { name: "tavily", apiKey: process.env.TAVILY_API_KEY };
  }
  if (process.env.BRAVE_API_KEY) {
    return { name: "brave", apiKey: process.env.BRAVE_API_KEY };
  }
  if (process.env.SERPER_API_KEY) {
    return { name: "serper", apiKey: process.env.SERPER_API_KEY };
  }
  if (process.env.SERPAPI_API_KEY) {
    return { name: "serpapi", apiKey: process.env.SERPAPI_API_KEY };
  }
  return null;
}

export async function searchWeb(
  query: string,
  options: { maxResults?: number } = {}
): Promise<SearchResult[]> {
  const provider = detectProvider();
  if (!provider) {
    console.warn("[Web Search] No search API key set — skipping web search.");
    return [];
  }

  const { maxResults = 10 } = options;
  console.log(`[Web Search] Using ${provider.name}`);

  switch (provider.name) {
    case "tavily":
      return searchTavily(provider.apiKey, query, maxResults);
    case "brave":
      return searchBrave(provider.apiKey, query, maxResults);
    case "serper":
      return searchSerper(provider.apiKey, query, maxResults);
    case "serpapi":
      return searchSerpAPI(provider.apiKey, query, maxResults);
    case "exa":
      return searchExa(provider.apiKey, query, maxResults);
  }
}

export function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((r, i) => `[Source ${i + 1}] "${r.title}"\nURL: ${r.url}\nExcerpt: ${r.content}\n`)
    .join("\n");
}

// --- Tavily ---
async function searchTavily(apiKey: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
      search_depth: "advanced",
    }),
  });
  if (!res.ok) { console.warn(`[Tavily] ${res.status}`); return []; }
  const data = await res.json() as { results: Array<{ title: string; url: string; content: string; score: number }> };
  return (data.results || []).map((r) => ({ title: r.title, url: r.url, content: r.content, score: r.score }));
}

// --- Brave Search ---
async function searchBrave(apiKey: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, count: String(maxResults) });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
  });
  if (!res.ok) { console.warn(`[Brave] ${res.status}`); return []; }
  const data = await res.json() as { web?: { results: Array<{ title: string; url: string; description: string }> } };
  return (data.web?.results || []).map((r, i) => ({
    title: r.title, url: r.url, content: r.description, score: 1 - i * 0.05,
  }));
}

// --- Serper.dev (Google results) ---
async function searchSerper(apiKey: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: maxResults }),
  });
  if (!res.ok) { console.warn(`[Serper] ${res.status}`); return []; }
  const data = await res.json() as { organic: Array<{ title: string; link: string; snippet: string }> };
  return (data.organic || []).map((r, i) => ({
    title: r.title, url: r.link, content: r.snippet, score: 1 - i * 0.05,
  }));
}

// --- SerpAPI ---
async function searchSerpAPI(apiKey: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, api_key: apiKey, num: String(maxResults), engine: "google" });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) { console.warn(`[SerpAPI] ${res.status}`); return []; }
  const data = await res.json() as { organic_results: Array<{ title: string; link: string; snippet: string }> };
  return (data.organic_results || []).map((r, i) => ({
    title: r.title, url: r.link, content: r.snippet, score: 1 - i * 0.05,
  }));
}

// --- Exa.ai (semantic search) ---
async function searchExa(apiKey: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      useAutoprompt: true,
      type: "auto",
      contents: { text: { maxCharacters: 4000 } },
    }),
  });
  if (!res.ok) { console.warn(`[Exa] ${res.status}`); return []; }
  const data = await res.json() as { results: Array<{ title: string; url: string; text: string; score: number }> };
  return (data.results || []).map((r) => ({
    title: r.title, url: r.url, content: r.text, score: r.score,
  }));
}
