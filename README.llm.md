# Development Guide

## Overview
This guide explains how to add new paths and functionality to the Multi-LLM Backend.

## File Structure

```
src/
┣ routes/
┃ ┣ openai/
┃ ┣ gemini/
┃ ┣ claude/
┃ ┗ multi/
┣ services/
┃ ┣ openai.ts
┃ ┣ gemini.ts
┃ ┗ claude.ts
┣ schema/
┃ ┣ routes/
┃ ┃ ┣ openai.ts
┃ ┃ ┣ gemini.ts
┃ ┃ ┗ claude.ts
┣ types.ts
┗ index.ts
```

## Tech Stack
- Hono.js
- Cloud Run（Runtime: Node.js）
- hono/zod-openapi

## Adding New Path

### Implementation Steps

#### 1. Create Schema/routes
Create a new route schema in `src/schema/routes/your-new-path.ts`:

For example,

```ts
export const CompletionRoute = createRoute({
  method: 'post',
  path: '/some-llm/completion',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ResponseSchema
        }
      },
      description: 'Successful completion'
    },
    400: {
      description: 'Invalid request'
    }
  }
})
```

#### 2. Create Service (Optional)
If needed, create `src/services/your-service.ts`:
Check existing services for reference.

#### 3. Create Route Handler
Create a new route handler in `src/routes/your-new-path/completion.ts`:

For example,

```ts
import type { OpenAPIHono } from '@hono/zod-openapi'
import type { HonoApp } from '../../types.js'
import { CompletionRoute } from '../../schema/routes/gemini/completion.js'
import { GeminiService } from '../../services/gemini.service.js'
import { validatePrompts } from '../../utils/validation.js'

export const completionAPI = (app: OpenAPIHono<HonoApp>) => {
  app.openapi(CompletionRoute, async (c) => {
    try {
      const { systemPrompt, userPrompts, responseSchema } = c.req.valid('json')
      validatePrompts(userPrompts)

      const gemini = new GeminiService(c.get("SECRETS"))
      const completion = await gemini.completion(systemPrompt, userPrompts, responseSchema)

      return c.json({ completion })
    } catch (e) {
      console.error(e)
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400
      )
    }
  })
}
```

#### 4. Register Route
Add to `src/index.ts`:

```typescript
import { completionAPI as yourNewCompletionAPI } from './routes/your-new-path/completion.js'

// ... existing imports and setup

// Register your new route
yourNewCompletionAPI(app)
```

#### 5. Add Secrets
This app uses Google Secret Manager to store secrets.
If your new path requires new secrets,

- update SecretsSchema `src/env.ts`.
- update Google Secret Manager.

#### 6. Add Tests (Optional)
Add tests in `tests/your-new-path.spec.ts`.
Tests are written with Vitest.
