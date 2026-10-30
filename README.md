# Next AI SDK Playground

This is a small Next.js application for experimenting with the [AI SDK](https://ai-sdk.dev/) v7 and different ways to integrate AI features into a Next.js app. It is primarily a learning and implementation playground rather than a finished product.

The current experiments include:

- **Chat** at `/chat`: an authenticated streaming chat built with [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat), `streamText`, and UI message streams. Chat history is persisted for the signed-in user.
- **AI examples** at `/examples`: examples of [`ToolLoopAgent`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent), tool calling, and structured output with `generateText` and `Output.object`.
- **Image generation** at `/image`: a prompt-based image generation flow.
- **Cards** at `/cards`: a card-set management interface for experimenting with application data and workflows.

## Getting started

### Prerequisites

- Node.js 22 or later
- [pnpm](https://pnpm.io/)
- A configured model provider/API key
- PostgreSQL and Upstash Redis for the application data and chat rate limiting

### Install and configure

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the local environment file from the template:

   ```bash
   cp .env.example .env
   ```

   Fill in the values required by `.env.example`, including the model provider credentials, `DATABASE_URL`, and the Upstash Redis credentials used by the chat route. Do not commit `.env` or any API keys.

3. Apply the database migrations:

   ```bash
   pnpm db:migrate
   ```

### Run the app

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account or sign in at `/login`, then use the navigation to try the chat, image generation, AI examples, and cards pages.

## Useful commands

| Command           | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `pnpm dev`        | Start the Next.js development server.                                |
| `pnpm build`      | Create a production build.                                           |
| `pnpm start`      | Run the production build.                                            |
| `pnpm lint`       | Run the project linter.                                              |
| `pnpm test`       | Run unit and component tests with Vitest.                            |
| `pnpm test:e2e`   | Run the Playwright end-to-end suite.                                 |
| `pnpm db:migrate` | Apply pending Drizzle database migrations.                           |
| `pnpm db:push`    | Push the current schema directly to the database during development. |
| `pnpm db:studio`  | Open Drizzle Studio to inspect the database.                         |

The e2e suite never touches the development database. It uses a separate database derived from `DATABASE_URL` (named `<database>_test`, or `E2E_DATABASE_URL` when set), creates and migrates it on first run, and clears it before and after every run. It serves the app on port `3100` from a separate `.next-e2e` build directory, so it can run alongside `pnpm dev`.

## AI SDK resources

- [AI SDK documentation](https://ai-sdk.dev/docs) — concepts, guides, and API references.
- [Next.js App Router quickstart](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — a complete streaming chat example for Next.js.
- [AI SDK UI](https://ai-sdk.dev/docs/reference/ai-sdk-ui) — React hooks and utilities for chat interfaces.
- [Generating structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — schema-constrained output with `generateText` and `Output`.
- [ToolLoopAgent reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent) — multi-step agents that call tools.
- [Next.js documentation](https://nextjs.org/docs) — the framework used by this playground.

## Testing

```bash
pnpm test      # unit and component tests
pnpm test:e2e  # end-to-end tests
```
