/**
 * Single source of truth for default configuration values.
 * Import these wherever defaults are needed to keep things consistent.
 */

export const DEFAULT_ROLE = "product designer";
export const DEFAULT_INDUSTRY = "tech";
export const DEFAULT_SENIORITY: string[] = ["principal", "senior"];
export const DEFAULT_MAX_SOURCES = 10;
export const DEFAULT_USE_CACHE = true;

// Predefined options for interactive prompts
export const ROLE_OPTIONS = [
  "product designer",
  "ux designer",
  "design technologist",
];

export const INDUSTRY_OPTIONS = [
  "tech",
  "fintech",
  "e-commerce",
];

export const SENIORITY_OPTIONS = [
  "senior",
  "principal",
  "staff",
];
