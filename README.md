# 411 - Deep Research Assistant

An intelligent research assistant that performs multi-step web searches and synthesizes comprehensive answers to complex questions.

## Overview

411 is a sophisticated AI-powered research application that goes beyond simple search. It understands your questions, performs iterative searches, analyzes content from multiple sources, and delivers well-researched, comprehensive answers.

### Key Features

- **Deep Search Capability**: Performs multi-step research to gather comprehensive information
- **Intelligent Content Analysis**: Scrapes and analyzes web content to extract relevant information
- **Context-Aware Responses**: Maintains conversation history for more relevant follow-up research
- **Real-Time Streaming**: See the research process unfold in real-time
- **Source Attribution**: All information includes proper citations and source links
- **Safety Guardrails**: Built-in content moderation and safety checks

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **AI Models**: Google AI SDK (Gemini) for language processing
- **Search**: Serper API for web search
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for content caching
- **Authentication**: NextAuth v5 with Discord OAuth
- **Observability**: OpenTelemetry with Langfuse
- **Styling**: Tailwind CSS

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for local database and Redis)
- API keys for Google AI and Serper

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 411
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following in your `.env` file:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI API key
- `SERPER_API_KEY`: Serper search API key
- `AUTH_DISCORD_ID` & `AUTH_DISCORD_SECRET`: Discord OAuth credentials
- `AUTH_SECRET`: NextAuth secret
- `LANGFUSE_*`: Langfuse observability credentials (optional)

4. Start the database and Redis:
```bash
./start-database.sh
./start-redis.sh
```

5. Run database migrations:
```bash
pnpm db:push
```

6. Start the development server:
```bash
pnpm dev
```

## Development

### Available Scripts

```bash
pnpm dev          # Start development server with turbo
pnpm build        # Build for production
pnpm start        # Start production server
pnpm preview      # Build and preview production build

# Code Quality
pnpm check        # Run linting and type checking
pnpm lint         # Run Next.js linter
pnpm lint:fix     # Auto-fix linting issues
pnpm typecheck    # Run TypeScript type checking
pnpm format:write # Format code with Prettier

# Database
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run database migrations
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio

# Testing
pnpm evals        # Run evaluation tests in watch mode
```

### Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── server/          
│   ├── auth/        # Authentication configuration
│   ├── db/          # Database schema and queries
│   ├── redis/       # Redis caching utilities
│   └── tools/       # Server-side tools (crawler, etc.)
├── deep-search.ts    # Core search orchestration
├── run-agent-loop.ts # Agent loop implementation
├── answer-question.ts # Answer generation logic
├── summarize-url.ts  # Content summarization
├── guardrails.ts    # Safety checks
├── clarification.ts # Query clarification logic
└── types.ts         # TypeScript types
```

## Architecture

### Research Flow

1. **Query Processing**: User question is analyzed for clarity and safety
2. **Search Planning**: System determines search strategy
3. **Iterative Search**: Multiple searches are performed to gather comprehensive information
4. **Content Analysis**: Web pages are scraped and analyzed
5. **Answer Synthesis**: Information is synthesized into a comprehensive response
6. **Source Attribution**: All claims are backed by proper citations

### Key Components

- **System Context**: Maintains conversation state and search history
- **Agent Loop**: Orchestrates the multi-step research process
- **Content Crawler**: Respects robots.txt while extracting web content
- **Redis Cache**: Caches crawled content for 6 hours
- **Rate Limiting**: Protects against abuse

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the existing code style
3. Ensure all tests pass and types check
4. Submit a pull request with a clear description

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing file naming convention (dash-case)
- Use `size-*` utilities instead of `h-* w-*` for dimensions
- Prefer non-optional properties where possible
- Use `import type` for type-only imports

## License

[License information here]

## Support

For issues and feature requests, please use the GitHub issue tracker.