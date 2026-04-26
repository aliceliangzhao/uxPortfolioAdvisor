#!/usr/bin/env node
/**
* CLI for the UX Portfolio Advisor.
* Handles first-run setup (API keys), interactive prompts, and CLI flags.
*/

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Command } from "commander";
import { select, checkbox, input, password } from "@inquirer/prompts";
import {
 DEFAULT_SENIORITY, DEFAULT_ROLE, DEFAULT_INDUSTRY, DEFAULT_MAX_SOURCES,
 ROLE_OPTIONS, INDUSTRY_OPTIONS, SENIORITY_OPTIONS,
} from "./shared/defaults.ts";
import { runResearchAgent } from "./research/index.ts";

const ENV_PATH = path.resolve(process.cwd(), ".env");
const OTHER = "Other (type your own)";

const PLACEHOLDERS = [
 "your-anthropic-api-key", "your-openai-api-key", "your-gemini-api-key",
 "your-openrouter-api-key", "your-bedrock-api-key",
 "your-exa-api-key", "your-tavily-api-key", "your-brave-api-key",
 "your-serper-api-key", "your-serpapi-api-key", "",
];

const LLM_PROVIDERS = [
 { name: "Anthropic", envKey: "ANTHROPIC_API_KEY", url: "https://console.anthropic.com" },
 { name: "OpenAI", envKey: "OPENAI_API_KEY", url: "https://platform.openai.com/api-keys" },
 { name: "Google Gemini", envKey: "GEMINI_API_KEY", url: "https://aistudio.google.com/apikey" },
 { name: "OpenRouter", envKey: "OPENROUTER_API_KEY", url: "https://openrouter.ai/keys" },
 { name: "AWS Bedrock", envKey: "AWS_BEARER_TOKEN_BEDROCK", url: "https://console.aws.amazon.com/bedrock" },
];

const SEARCH_PROVIDERS = [
 { name: "Exa (recommended)", envKey: "EXA_API_KEY", url: "https://dashboard.exa.ai/api-keys" },
 { name: "Tavily", envKey: "TAVILY_API_KEY", url: "https://app.tavily.com/home" },
 { name: "Brave Search", envKey: "BRAVE_API_KEY", url: "https://brave.com/search/api" },
 { name: "Serper", envKey: "SERPER_API_KEY", url: "https://serper.dev/api-key" },
 { name: "SerpAPI", envKey: "SERPAPI_API_KEY", url: "https://serpapi.com/manage-api-key" },
];

function isValidKey(value: string | undefined): boolean {
 return !!value && !PLACEHOLDERS.includes(value.trim());
}

function hasValidLLMKey(): boolean {
 return LLM_PROVIDERS.some((p) => isValidKey(process.env[p.envKey]));
}

function hasValidSearchKey(): boolean {
 return SEARCH_PROVIDERS.some((p) => isValidKey(process.env[p.envKey]));
}

function readEnvFile(): Record<string, string> {
 if (!fs.existsSync(ENV_PATH)) return {};
 const content = fs.readFileSync(ENV_PATH, "utf-8");
 const env: Record<string, string> = {};
 for (const line of content.split("\n")) {
   const trimmed = line.trim();
   if (!trimmed || trimmed.startsWith("#")) continue;
   const eqIdx = trimmed.indexOf("=");
   if (eqIdx > 0) {
     env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
   }
 }
 return env;
}

function writeEnvFile(env: Record<string, string>): void {
 const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
 fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n", "utf-8");
}

async function ensureKeys(): Promise<void> {
 const needsLLM = !hasValidLLMKey();
 const needsSearch = !hasValidSearchKey();

 if (!needsLLM && !needsSearch) return;

 console.log("\n🔧 First-time setup — let's configure your API keys.\n");

 const env = readEnvFile();

 if (needsLLM) {
   const provider = await select({
     message: "Which AI provider do you want to use?",
     choices: LLM_PROVIDERS.map((p) => ({ name: p.name, value: p })),
   });
   console.log(`\n   Get your key here: ${provider.url}\n`);
   const key = await password({
     message: `Paste your ${provider.name} API key:`,
     mask: "*",
   });
   env[provider.envKey] = key.trim();
   process.env[provider.envKey] = key.trim();
 }

 if (needsSearch) {
   const provider = await select({
     message: "Which web search provider do you want to use?",
     choices: SEARCH_PROVIDERS.map((p) => ({ name: p.name, value: p })),
   });
   console.log(`\n   Get your key here: ${provider.url}\n`);
   const key = await password({
     message: `Paste your ${provider.name} API key:`,
     mask: "*",
   });
   env[provider.envKey] = key.trim();
   process.env[provider.envKey] = key.trim();
 }

 writeEnvFile(env);
 console.log("\n✅ Keys saved to .env\n");
}

// --- Research prompts ---
async function promptRole(): Promise<string> {
 const choice = await select({
   message: "What's your role?",
   choices: [...ROLE_OPTIONS, OTHER].map((v) => ({ name: v, value: v })),
   default: DEFAULT_ROLE,
 });
 if (choice === OTHER) return input({ message: "Enter your role:" });
 return choice;
}

async function promptIndustry(): Promise<string> {
 const choice = await select({
   message: "What industry are you targeting?",
   choices: [...INDUSTRY_OPTIONS, OTHER].map((v) => ({ name: v, value: v })),
   default: DEFAULT_INDUSTRY,
 });
 if (choice === OTHER) return input({ message: "Enter your industry:" });
 return choice;
}

async function promptSeniority(): Promise<string[]> {
 const choices = await checkbox({
   message: "Which seniority levels? (space to select, enter to confirm)",
   choices: [...SENIORITY_OPTIONS, OTHER].map((v) => ({
     name: v, value: v, checked: DEFAULT_SENIORITY.includes(v),
   })),
 });
 const result = choices.filter((c) => c !== OTHER);
 if (choices.includes(OTHER)) {
   const custom = await input({ message: "Enter custom seniority level:" });
   if (custom.trim()) result.push(custom.trim());
 }
 if (result.length === 0) {
   console.log("No levels selected — using defaults.");
   return DEFAULT_SENIORITY;
 }
 return result;
}

// --- CLI ---
const program = new Command();

program
 .name("ux-portfolio-advisor")
 .description("AI-powered UX portfolio advisor")
 .version("0.1.0");

program
 .command("research", { isDefault: true })
 .description("Generate a portfolio structure guide based on current web research")
 .option("--role <role>", "designer role")
 .option("--industry <industry>", "target industry")
 .option("--seniority <levels>", "comma-separated seniority levels")
 .option("--no-cache", "ignore cached output and regenerate")
 .action(async (options) => {
   await ensureKeys();

   const hasFlags = options.role || options.industry || options.seniority;
   let role: string;
   let industry: string;
   let seniority: string[];

   if (hasFlags) {
     role = options.role ?? DEFAULT_ROLE;
     industry = options.industry ?? DEFAULT_INDUSTRY;
     seniority = options.seniority
       ? options.seniority.split(",").map((s: string) => s.trim())
       : DEFAULT_SENIORITY;
   } else {
     console.log("\n🎨 UX Portfolio Advisor\n");
     role = await promptRole();
     industry = await promptIndustry();
     seniority = await promptSeniority();
     console.log("");
   }

   await runResearchAgent({
     role, industry, seniority,
     useCache: options.cache,
     maxSources: DEFAULT_MAX_SOURCES,
   });
 });

program
 .command("setup")
 .description("Reconfigure API keys")
 .action(async () => {
   for (const p of [...LLM_PROVIDERS, ...SEARCH_PROVIDERS]) {
     delete process.env[p.envKey];
   }
   await ensureKeys();
 });

program.parse(process.argv);