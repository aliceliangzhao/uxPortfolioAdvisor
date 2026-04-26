#!/usr/bin/env node
/**
 * CLI for the UX Portfolio Research Agent.
 * Usage: npm start [options]
 */

import "dotenv/config";
import { Command } from "commander";
import { DEFAULT_SENIORITY, DEFAULT_ROLE, DEFAULT_INDUSTRY } from "./shared/defaults.js";

const program = new Command();

program
  .name("ux-portfolio-advisor")
  .description("AI-powered UX portfolio advisor")
  .version("0.1.0");

program
  .command("research", { isDefault: true })
  .description("Generate a portfolio structure guide based on current web research")
  .option("--role <role>", "designer role", DEFAULT_ROLE)
  .option("--industry <industry>", "target industry", DEFAULT_INDUSTRY)
  .option("--seniority <levels>", "comma-separated seniority levels", DEFAULT_SENIORITY.join(","))
  .option("--no-cache", "ignore cached output and regenerate")
  .action(async (options) => {
    const { runResearchAgent } = await import("./agent/index.js");
    await runResearchAgent({
      role: options.role,
      industry: options.industry,
      seniority: options.seniority.split(",").map((s: string) => s.trim()),
      useCache: options.cache,
    });
  });

program.parse(process.argv);
