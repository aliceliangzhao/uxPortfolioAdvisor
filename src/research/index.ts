/**
* UX Portfolio Advisor
*
* Searches the web for current portfolio best practices, then synthesizes
* them into a structured guide with proper citations. Outputs:
*   - outputs/research/portfolio-guide.md    (human-readable guide)
*   - outputs/research/portfolio-guide.json  (machine-readable, validated)
*   - outputs/research/portfolio-rules.md    (AI-consumable steering rules)
*/

import { generate } from "../shared/llm/client.ts";
import { searchWeb, formatSearchResultsForPrompt } from "../shared/web-search/index.ts";
import { writeOutput, readOutput, outputExists } from "../shared/storage/index.ts";
import { PortfolioStructureSchema } from "../shared/schemas/portfolio-structure.ts";
import { DEFAULT_SENIORITY, DEFAULT_ROLE, DEFAULT_INDUSTRY } from "../shared/defaults.ts";
import type { PortfolioStructure } from "../shared/schemas/portfolio-structure.ts";
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

 if (useCache && await outputExists("research", "portfolio-guide.json")) {
   console.log("[Research] Using cached output.");
   const cached = await readOutput("research", "portfolio-guide.json");
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
- If the web results don't cover a topic, you may still provide guidance — just mark it with † instead of [N].
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
 await writeOutput("research", "portfolio-guide.json", data);
 await writeOutput("research", "portfolio-guide.md", formatAsMarkdown(data));
 await writeOutput("research", "portfolio-rules.md", formatAsRules(data));
 saveSpinner.succeed("Saved to outputs/research/");

 console.log("\n✅ Done! Your outputs:");
 console.log("   📖 outputs/research/portfolio-guide.md  — read this for the full guide");
 console.log("   🤖 outputs/research/portfolio-rules.md  — drop this into your AI coding tool\n");
 return data;
}

function formatAsMarkdown(data: PortfolioStructure): string {
 const lines: string[] = [
   `# UX Portfolio Guide`,
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

function formatAsRules(data: PortfolioStructure): string {
 const seniorityLevels = data.seniority.split(",").map((s) => s.trim());
 const multiLevel = seniorityLevels.length > 1;

 const lines: string[] = [
   `# UX Portfolio Rules`,
   ``,
   `> Generated by [UX Portfolio Advisor](https://github.com/YOUR_USERNAME/uxPortfolioAdvisor).`,
   `> Role: ${data.role} | Industry: ${data.industry} | Seniority: ${data.seniority}`,
   `> Generated: ${data.generatedAt}`,
   ``,
   `These are opinionated rules for building a UX portfolio. Use them as steering context in your AI coding tool.`,
   ``,
 ];

 // Portfolio sections as rules
 lines.push(`## Required Sections`);
 lines.push(``);
 for (const s of data.portfolioSections) {
   if (s.required) {
     lines.push(`- MUST include a "${s.title}" section: ${s.description}`);
   }
 }
 lines.push(``);
 lines.push(`## Optional Sections`);
 lines.push(``);
 for (const s of data.portfolioSections) {
   if (!s.required) {
     lines.push(`- SHOULD include a "${s.title}" section: ${s.description}`);
   }
 }
 lines.push(``);

 // Seniority-specific rules
 if (multiLevel) {
   for (const level of seniorityLevels) {
     lines.push(`## Rules for ${level.charAt(0).toUpperCase() + level.slice(1)} Level`);
     lines.push(``);
     for (const s of data.portfolioSections) {
       const levelMention = s.guidance.toLowerCase().includes(level.toLowerCase());
       if (levelMention) {
         // Extract sentences mentioning this level
         const sentences = s.guidance.split(/(?<=[.!?])\s+/).filter(
           (sent) => sent.toLowerCase().includes(level.toLowerCase())
         );
         for (const sent of sentences) {
           lines.push(`- ${sent.replace(/\[\d+\]/g, "").replace(/†/g, "").trim()}`);
         }
       }
     }
     lines.push(``);
   }
 } else {
   lines.push(`## Portfolio Guidance`);
   lines.push(``);
   for (const s of data.portfolioSections) {
     // Strip citations for clean rules
     const cleanGuidance = s.guidance.replace(/\[\d+\]/g, "").replace(/†/g, "").trim();
     lines.push(`### ${s.title}`);
     lines.push(`- ${cleanGuidance}`);
     lines.push(``);
   }
 }

 // Case study rules
 lines.push(`## Case Study Rules`);
 lines.push(``);
 lines.push(`- MUST include at least ${data.caseStudyTemplate.minArtifacts} artifacts per case study`);
 lines.push(`- Recommended length: ${data.caseStudyTemplate.recommendedLength}`);
 lines.push(``);
 for (const s of data.caseStudyTemplate.sections) {
   const clean = s.guidance.replace(/\[\d+\]/g, "").replace(/†/g, "").trim();
   lines.push(`### ${s.title}`);
   lines.push(`- ${clean}`);
   lines.push(``);
 }

 // Anti-patterns
 lines.push(`## MUST NOT`);
 lines.push(``);
 for (const ap of data.antiPatterns) {
   lines.push(`- MUST NOT: ${ap}`);
 }
 lines.push(``);

 // What matters
 lines.push(`## What Hiring Managers Evaluate`);
 lines.push(``);
 for (const p of data.hiringManagerPriorities) {
   const clean = p.replace(/\[\d+\]/g, "").replace(/†/g, "").trim();
   lines.push(`- ${clean}`);
 }

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