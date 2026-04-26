/**
 * UX Portfolio Advisor
 *
 * Searches the web for current portfolio best practices, then synthesizes
 * them into a structured guide with proper citations. Outputs:
 *   - outputs/research/portfolio-structure.md  (human-readable)
 *   - outputs/research/portfolio-structure.json (machine-readable, validated)
 */

import { generate } from "../shared/llm/client.js";
import { searchWeb, formatSearchResultsForPrompt } from "../shared/web-search/index.js";
import { writeOutput, readOutput, outputExists } from "../shared/storage/index.js";
import { PortfolioStructureSchema } from "../shared/schemas/portfolio-structure.js";
import { DEFAULT_SENIORITY, DEFAULT_ROLE, DEFAULT_INDUSTRY } from "../shared/defaults.js";
import type { PortfolioStructure } from "../shared/schemas/portfolio-structure.js";
import ora from "ora";

export interface ResearchParams {
  role: string;
  industry: string;
  seniority: string | string[];
  maxSources?: number;
  useCache?: boolean;
}

export async function runResearchAgent(params: ResearchParams): Promise<PortfolioStructure> {
  const { role, industry, seniority: rawSeniority, useCache = true } = params;
  const seniority = Array.isArray(rawSeniority) ? rawSeniority.join(", ") : rawSeniority;

  if (useCache && await outputExists("research", "portfolio-structure.json")) {
    console.log("[Research] Using cached output.");
    const cached = await readOutput("research", "portfolio-structure.json");
    return PortfolioStructureSchema.parse(JSON.parse(cached!));
  }

  console.log(`\n🔍 Generating portfolio guide for ${seniority} ${role} in ${industry}\n`);

  const systemPrompt = `You are a UX design manager, director, or product manager at a high-paying
tech company (or tech-adjacent company like fintech, healthtech, or design tooling) who is actively
hiring senior-and-above designers for your team. You have reviewed hundreds of portfolios, conducted
design portfolio reviews, and made hiring decisions at the senior, principal, and staff levels.
Your task is to advise designers on what actually moves the needle in a portfolio from the
perspective of someone who will be evaluating and hiring them.

CRITICAL RULES FOR SOURCES AND ATTRIBUTION:
- Use [N] citations for claims backed by a specific web source from the "Web Research Results" section.
- Use † to mark guidance that is inferred from your own synthesis or expertise (not directly from a provided source).
- Do NOT invent or fabricate source citations. Every [N] must correspond to a real provided source.
- In the "sources" array, only include sources from the provided web results, using their exact titles and URLs.`;

  const prompt = `Create a comprehensive portfolio structure guide for a ${role}
targeting the ${industry} industry. The guide should cover the following seniority levels: ${seniority}.

For each seniority level, tailor the guidance to reflect the expectations at that level
(e.g., senior focuses on craft depth, principal on strategic impact, staff on org-wide influence).

IMPORTANT — Citation and attribution requirements:
- Use numbered in-text citations [1], [2], etc. when referencing a specific web source.
- Use † to mark advice that comes from your own synthesis or expertise, not a specific source.
- Each source must have a unique number.
- In the "sources" array, provide structured source objects with id, title, author, year, url (if available), and type.
- Aim for a mix of cited [N] and inferred † guidance — both are valuable, but the reader should know which is which.

Return a JSON object matching this exact structure:
{
  "role": "${role}",
  "seniority": "${seniority}",
  "industry": "${industry}",
  "portfolioSections": [
    {
      "id": "string",
      "title": "string",
      "required": boolean,
      "description": "string",
      "guidance": "string (use [N] for cited claims, † for inferred advice)",
      "antiPatterns": ["string"]
    }
  ],
  "caseStudyTemplate": {
    "sections": [ ...same shape as portfolioSections... ],
    "minArtifacts": number,
    "recommendedLength": "string"
  },
  "hiringManagerPriorities": ["string (include [N] citations where relevant)"],
  "antiPatterns": ["string"],
  "sources": [
    {
      "id": 1,
      "title": "Article or book title",
      "author": "Author or organization name",
      "year": "2024",
      "url": "https://example.com/article (optional)",
      "type": "article | book | talk | report | website"
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}

Be specific and actionable. Include 6-8 portfolio sections and 5-7 case study sections.`;

  // Search the web for current sources
  const searchSpinner = ora("Searching the web for current portfolio best practices...").start();
  const searchResults = await searchWeb(
    `UX portfolio best practices ${seniority} product designer ${new Date().getFullYear()}`,
    { maxResults: params.maxSources ?? 10 }
  );
  const webContext = formatSearchResultsForPrompt(searchResults);

  let finalPrompt = prompt;
  if (webContext) {
    searchSpinner.succeed(`Found ${searchResults.length} sources`);
    finalPrompt = `${prompt}\n\n---\n\n# Web Research Results (ONLY USE THESE AS SOURCES)\n\nThese are the ONLY sources you may cite. Do not add any sources beyond this list.\n\n${webContext}`;
  } else {
    searchSpinner.warn("No web results available — using model knowledge only");
  }

  const generateSpinner = ora("Synthesizing portfolio guide (this may take a minute)...").start();
  const raw = await generate(systemPrompt, finalPrompt, { maxTokens: 16000 });

  generateSpinner.text = "Parsing and validating output...";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    generateSpinner.fail("Model did not return valid JSON");
    throw new Error("[Research] Model did not return valid JSON");
  }

  const data = PortfolioStructureSchema.parse(JSON.parse(jsonMatch[0]));
  generateSpinner.succeed("Guide generated");

  const saveSpinner = ora("Saving output...").start();
  await writeOutput("research", "portfolio-structure.json", data);
  await writeOutput("research", "portfolio-structure.md", formatAsMarkdown(data));
  saveSpinner.succeed("Saved to outputs/research/");

  console.log("\n✅ Done! Open outputs/research/portfolio-structure.md to read your guide.\n");
  return data;
}

function formatAsMarkdown(data: PortfolioStructure): string {
  const lines: string[] = [
    `# UX Portfolio Structure Guide`,
    `**Role:** ${data.role} | **Seniority:** ${data.seniority} | **Industry:** ${data.industry}`,
    `**Generated:** ${data.generatedAt}`,
    ``,
    `> **Legend:** \`[N]\` = cited from web source | \`†\` = inferred from synthesis`,
    ``,
    `## Portfolio Sections`,
    ...data.portfolioSections.map((s) => [
      `### ${s.required ? "✓" : "○"} ${s.title}`,
      s.description,
      `**Guidance:** ${s.guidance}`,
      s.antiPatterns.length ? `**Avoid:** ${s.antiPatterns.join("; ")}` : "",
      "",
    ].join("\n")),
    `## Case Study Template`,
    `*${data.caseStudyTemplate.recommendedLength} | Min ${data.caseStudyTemplate.minArtifacts} artifacts*`,
    ``,
    ...data.caseStudyTemplate.sections.map((s) => `### ${s.title}\n${s.guidance}\n`),
    `## What Hiring Managers Prioritize`,
    ...data.hiringManagerPriorities.map((p) => `- ${p}`),
    ``,
    `## Anti-Patterns to Avoid`,
    ...data.antiPatterns.map((p) => `- ${p}`),
    ``,
    `---`,
    ``,
    `## References`,
    ``,
    ...data.sources.map((s) => {
      const urlPart = s.url ? ` Available at: ${s.url}` : "";
      return `[${s.id}] ${s.author} (${s.year}). *${s.title}*. ${s.type}.${urlPart}`;
    }),
  ];
  return lines.join("\n");
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runResearchAgent({
    role: DEFAULT_ROLE,
    industry: DEFAULT_INDUSTRY,
    seniority: DEFAULT_SENIORITY,
  }).catch(console.error);
}
