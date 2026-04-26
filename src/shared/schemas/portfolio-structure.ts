import { z } from "zod";

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  required: z.boolean(),
  description: z.string(),
  guidance: z.string(),
  antiPatterns: z.array(z.string()),
});

export const CaseStudyTemplateSchema = z.object({
  sections: z.array(SectionSchema),
  minArtifacts: z.number(),
  recommendedLength: z.string(),
});

export const SourceSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  year: z.string(),
  url: z.string().optional(),
  type: z.string(),
});

export const PortfolioStructureSchema = z.object({
  role: z.string(),
  seniority: z.string(),
  industry: z.string(),
  portfolioSections: z.array(SectionSchema),
  caseStudyTemplate: CaseStudyTemplateSchema,
  hiringManagerPriorities: z.array(z.string()),
  antiPatterns: z.array(z.string()),
  sources: z.array(SourceSchema),
  generatedAt: z.string(),
});

export type Section = z.infer<typeof SectionSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type PortfolioStructure = z.infer<typeof PortfolioStructureSchema>;
