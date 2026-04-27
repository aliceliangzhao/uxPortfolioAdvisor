# Portfolio Site Advisor

An AI tool that researches current best practices and generates a personalized guide for building an effective UX/Product portfolio — tailored to your role, seniority level, and target industry. It searches the web in real time for advice from hiring managers, design leaders, and reputable UX experts, so every recommendation is backed by up-to-date, cited sources.

---

## What you'll get

Two outputs tailored to your role, industry, and seniority level:

1. **Portfolio Guide** (`portfolio-guide.md`) — a detailed, human-readable guide with:
   - What sections to include and why
   - How to write compelling case studies
   - What hiring managers actually look for
   - Common mistakes to avoid
   - All recommendations cited with real, current sources
   - Clear markers showing which advice is cited `[N]` vs. inferred `†`

2. **Portfolio Rules** (`portfolio-rules.md`) — an opinionated rules file you can drop into any AI coding tool (Claude Code, Cursor, Kiro, Copilot, Windsurf) so it builds your portfolio the right way. Uses MUST/SHOULD/MUST NOT language that AI tools understand.

---

## Before you start

You need to install **Node.js** on your computer:
- Check if you have it: open Terminal and type `node --version`
- If not installed: download from [nodejs.org](https://nodejs.org) — pick the LTS version

You'll also need two free API keys (the tool will walk you through getting them on first run).

---

## Setup (3 minutes)

### Step 1: Download the project

Click the button below to download, then unzip it anywhere on your computer.

[![Download ZIP](https://img.shields.io/badge/Download-ZIP-blue?style=for-the-badge)](https://github.com/miyakelly/uxPortfolioAdvisor/archive/refs/heads/main.zip)

Or if you're comfortable with Terminal:

```
git clone https://github.com/miyakelly/uxPortfolioAdvisor.git
cd uxPortfolioAdvisor
```

### Step 2: Install the project

Open Terminal, navigate to this folder, and run:

```
npm install
```

This command downloads everything the tool needs. You only do this once.

Then run:

```
npm start
```

On first run, the tool walks you through setting up your API keys right in the terminal:

1. Pick an LLM provider and paste your key
2. Pick a web search provider and paste your key

Your keys are saved locally in a `.env` file (never uploaded anywhere). On future runs, it skips this step and goes straight to the questions.

To reconfigure your keys later: `npm start -- setup`

### Where to get your API keys

**LLM provider key (pick one):**

| Provider        | Free tier           | How to get it |
|----------------|---------------------|---------------|
| Anthropic      | $5 credit to start  | [console.anthropic.com](https://console.anthropic.com) → Sign up → API Keys |
| OpenAI         | Pay-as-you-go       | [platform.openai.com](https://platform.openai.com) → Sign up → API Keys |
| Google Gemini  | Free                | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| OpenRouter     | $1 free credit      | [openrouter.ai](https://openrouter.ai) → Sign up → Keys |
| AWS Bedrock    | Free tier available | [console.aws.amazon.com/bedrock](https://console.aws.amazon.com/bedrock) → Sign up → API Keys |

**Web search key (pick one):**

| Provider | Free tier | How to get it |
|----------|-----------|---------------|
| Exa | 1000 searches/month | [exa.ai](https://exa.ai) → Sign up → API Key |
| Tavily | 1000 searches/month | [tavily.com](https://tavily.com) → Sign up → API Key |
| Brave Search | 1 req/sec free | [brave.com/search/api](https://brave.com/search/api) → Get Started |
| Serper | 2500 free credits | [serper.dev](https://serper.dev) → Sign up → API Key |

---

## Run it

```
npm start
```

That's it. The tool will ask you three questions:

1. What's your role?
2. What industry are you targeting?
3. Which seniority levels should the guide cover?

Then it will:
1. Search the web for current UX portfolio articles and research
2. Synthesize everything into a structured guide
3. Save the results to the `outputs/research/` folder

Your outputs:
- `outputs/research/portfolio-guide.md` — the full guide with citations (for you to read)
- `outputs/research/portfolio-rules.md` — opinionated rules for AI coding tools
- `outputs/research/portfolio-guide.json` — machine-readable data

---

## Using the rules with AI coding tools

The `portfolio-rules.md` file is designed to be dropped into any AI coding tool as context. Here's how:

| Tool | Where to put it |
|------|----------------|
| Claude Code | Append the contents to `CLAUDE.md` in your project root |
| Cursor | Copy to `.cursor/rules/portfolio-rules.md` in your project |
| Kiro | Copy to `.kiro/steering/portfolio-rules.md` in your project |
| GitHub Copilot | Append the contents to `.github/copilot-instructions.md` |
| Windsurf | Copy to `.windsurfrules` in your project root |
| Any tool | Paste into the system prompt or project context |

---

## Advanced usage

Skip the interactive prompts with CLI flags:
```
npm start -- --role "product designer" --industry tech --seniority "senior,principal"
```

Force regenerate (ignore cached output):
```
npm start -- --no-cache
```

---

## Troubleshooting

**"No LLM API key found"** — You haven't added an AI key to `.env`. See Step 2 above.

**"No search API key set"** — You haven't added a web search key to `.env`. The tool will still work but won't have current sources.

**"npm: command not found"** — Node.js isn't installed. Download it from [nodejs.org](https://nodejs.org).

**The output has old or made-up sources** — Make sure your web search key is set. Without it, the AI relies on its training data which may be outdated.

---

## Questions? Feedback? Suggestions?
Report bugs or suggest features via [Issues](https://github.com/miyakelly/uxPortfolioAdvisor/issues)
