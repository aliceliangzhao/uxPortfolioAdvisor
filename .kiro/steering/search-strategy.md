---
inclusion: always
---

# Search Strategy

This document defines how the UX Portfolio Advisor searches the web for sources. Reference this when modifying search queries, adding search angles, or changing the search approach.

## Search Angles

The tool runs two parallel searches to get diverse, high-quality sources:

### Angle 1: Hiring Manager Perspective
- Purpose: what hiring managers, design directors, and design managers look for when reviewing portfolios
- Query pattern: `"what hiring managers look for UX designer portfolio {seniority} {role} {year}"`
- Why: the goal of a portfolio is to get hired — the evaluator's perspective is the most actionable signal

### Angle 2: Effective Portfolio Analysis
- Purpose: analysis of what makes senior-level portfolios effective in practice
- Query pattern: `"senior staff designer portfolio case study examples what works {year}"`
- Why: complements the hiring angle with concrete execution patterns — not generic "best of" lists, but analysis of why specific portfolios succeed at the senior+ level

## Design Decisions

- Two predefined search angles, not LLM-generated follow-ups. The queries are deterministic and don't depend on the LLM's training data to decide what to search for.
- Exa semantic search is the preferred provider. It finds conceptually relevant content rather than just keyword matches, which surfaces more thoughtful articles.
- 4k characters per result (Exa Compact mode). Enough to get real article content, not just snippets. 10 results × 4k = ~40k chars of source material for the LLM.
- Results from both angles are deduplicated by URL before being passed to the LLM.
- The LLM is instructed to ONLY cite sources from the provided search results — no fabricated references. However, the LLM's training knowledge is used for reasoning, synthesis, and structuring the guide. The distinction: citations `[N]` must be verifiable web sources, while inferred guidance is marked with `†` so the reader knows which is which.

## What We Decided Against

- Multi-pass research (LLM generates follow-up queries): rejected because the LLM's gap detection is based on training data, which could steer searches toward popular-but-irrelevant topics. The predefined angles are more reliable.
- Designer's perspective search ("how I built my portfolio"): rejected because it's anecdotal and often not what actually gets people hired. The hiring manager perspective is more actionable.
- Generic "best portfolio" searches: rejected because roundup lists skew toward visual/junior portfolios, not the senior+ strategic portfolios this tool targets.

## Tuning Notes

- If output feels too abstract: increase Exa content limit beyond 4k, or add a third angle focused on specific case study writing techniques.
- If sources are too generic: make queries more specific to the seniority level (e.g., "principal designer" instead of "senior").
- The current year is appended to queries to bias toward recent content.
