# UX Portfolio Advisor

An AI tool that researches current best practices and generates a personalized guide for building an effective UX portfolio — tailored to your role, seniority level, and target industry. It searches the web in real time for advice from hiring managers, design leaders, and reputable UX experts, so every recommendation is backed by up-to-date, cited sources.

---

## What you'll get

A detailed portfolio structure guide (in Markdown and JSON) that includes:
- What sections to include and why
- How to write compelling case studies
- What hiring managers actually look for
- Common mistakes to avoid
- All recommendations cited with real, current sources

---

## Before you start

You'll need two things installed on your computer:

1. **Node.js** (version 18 or newer)
   - Check if you have it: open Terminal and type `node --version`
  - If not installed: download from <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> — pick the LTS version

2. **Two free API keys** (explained below)

---

## Setup (5 minutes)

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
cp .env.example .env
```

The first command downloads everything the tool needs. The second command creates your configuration file. You only do this once.

### Step 3: Get your API keys

You need two keys — one for the AI, one for web search. Both have free tiers.

**AI key (pick one):**

| Provider | Free tier | How to get it |
|----------|-----------|---------------|
| Anthropic | $5 credit to start | [console.anthropic.com](https://console.anthropic.com) → Sign up → API Keys |
| OpenAI | Pay-as-you-go | [platform.openai.com](https://platform.openai.com) → Sign up → API Keys |
| Google Gemini | Free | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| OpenRouter | $1 free credit | [openrouter.ai](https://openrouter.ai) → Sign up → Keys |

**Web search key (pick one):**

| Provider | Free tier | How to get it |
|----------|-----------|---------------|
| Exa | 1000 searches/month | [exa.ai](https://exa.ai) → Sign up → API Key |
| Tavily | 1000 searches/month | [tavily.com](https://tavily.com) → Sign up → API Key |
| Brave Search | 1 req/sec free | [brave.com/search/api](https://brave.com/search/api) → Get Started |
| Serper | 2500 free credits | [serper.dev](https://serper.dev) → Sign up → API Key |

### Step 4: Add your keys

Open the `.env` file in any text editor. It looks like this:

```
ANTHROPIC_API_KEY=
EXA_API_KEY=
```

Paste your keys after the `=` sign. For example:

```
ANTHROPIC_API_KEY=sk-ant-abc123...
EXA_API_KEY=exa-xyz789...
```

Only fill in one AI key and one search key. Leave the rest blank or commented out.

---

## Run it

```
npm start
```

That's it. The tool will:
1. Search the web for current UX portfolio articles and research
2. Synthesize everything into a structured guide
3. Save the results to the `outputs/research/` folder

Open `outputs/research/portfolio-structure.md` to read your guide.

---

## Customize it

Edit `config.yaml` to change who the guide is for:

```yaml
research:
  role: "product designer"       # your role
  industry: "tech"               # your target industry
  seniority:                     # levels to cover
    - "senior"
    - "principal"
    - "staff"
```

Then run `npm start` again to regenerate.

---

## Troubleshooting

**"No LLM API key found"** — You haven't added an AI key to `.env`. See Step 2 above.

**"No search API key set"** — You haven't added a web search key to `.env`. The tool will still work but won't have current sources.

**"npm: command not found"** — Node.js isn't installed. Download it from [nodejs.org](https://nodejs.org).

**The output has old or made-up sources** — Make sure your web search key is set. Without it, the AI relies on its training data which may be outdated.
