#!/usr/bin/env node
/**
 * CLI for the UX Portfolio Advisor.
 * Interactive prompts for role, industry, and seniority.
 * CLI flags bypass prompts for automation.
 */

import "dotenv/config";
import { Command } from "commander";
import { select, checkbox, input } from "@inquirer/prompts";
import {
  DEFAULT_SENIORITY, DEFAULT_ROLE, DEFAULT_INDUSTRY, DEFAULT_MAX_SOURCES,
  ROLE_OPTIONS, INDUSTRY_OPTIONS, SENIORITY_OPTIONS,
} from "./shared/defaults.ts";
import { runResearchAgent } from "./research/index.ts";

const OTHER = "Other (type your own)";

async function promptRole(): Promise<string> {
  const choice = await select({
    message: "What's your role?",
    choices: [...ROLE_OPTIONS, OTHER].map((v) => ({ name: v, value: v })),
    default: DEFAULT_ROLE,
  });
  if (choice === OTHER) {
    return input({ message: "Enter your role:" });
  }
  return choice;
}

async function promptIndustry(): Promise<string> {
  const choice = await select({
    message: "What industry are you targeting?",
    choices: [...INDUSTRY_OPTIONS, OTHER].map((v) => ({ name: v, value: v })),
    default: DEFAULT_INDUSTRY,
  });
  if (choice === OTHER) {
    return input({ message: "Enter your industry:" });
  }
  return choice;
}

async function promptSeniority(): Promise<string[]> {
  const choices = await checkbox({
    message: "Which seniority levels? (space to select, enter to confirm)",
    choices: [...SENIORITY_OPTIONS, OTHER].map((v) => ({
      name: v,
      value: v,
      checked: DEFAULT_SENIORITY.includes(v),
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
    const hasFlags = options.role || options.industry || options.seniority;

    let role: string;
    let industry: string;
    let seniority: string[];

    if (hasFlags) {
      // CLI flags provided — skip prompts
      role = options.role ?? DEFAULT_ROLE;
      industry = options.industry ?? DEFAULT_INDUSTRY;
      seniority = options.seniority
        ? options.seniority.split(",").map((s: string) => s.trim())
        : DEFAULT_SENIORITY;
    } else {
      // Interactive mode
      console.log("\n🎨 UX Portfolio Advisor\n");
      role = await promptRole();
      industry = await promptIndustry();
      seniority = await promptSeniority();
      console.log("");
    }

    await runResearchAgent({
      role,
      industry,
      seniority,
      useCache: options.cache,
      maxSources: DEFAULT_MAX_SOURCES,
    });
  });

program.parse(process.argv);
