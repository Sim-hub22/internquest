# AGENTS.md - InternQuest

## Project Overview

InternQuest is an internship-finding platform built with **Next.js 16**, **React 19**, **Convex** (backend/database), **Tailwind CSS v4**, and **shadcn/ui** (radix-nova style). Package manager: **pnpm**. The React Compiler is enabled -- never add manual `memo()`, `useMemo()`, or `useCallback()`.

## Commands

```bash
pnpm dev              # Run frontend (Next.js) + backend (Convex) in parallel
pnpm dev:frontend     # Next.js dev server only
pnpm dev:backend      # Convex dev server only
pnpm build            # Production build (next build)
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint auto-fix
pnpm format           # Prettier format all files
pnpm format:check     # Prettier check (no write)
```

No test framework is configured yet. When one is added, update this section with single-test commands.

## Pre-commit Hooks

Husky + lint-staged runs `eslint --fix` then `prettier --write` on staged `*.{ts,tsx,js,jsx,mdx}` files. Run `pnpm lint:fix && pnpm format` before committing to avoid hook failures.

## Project Structure

```
src/
  app/              # Next.js App Router (pages, layouts, route groups)
  components/       # Shared application components
  components/ui/    # shadcn/ui primitives -- DO NOT manually edit
  convex/           # Convex backend functions (queries, mutations, actions)
  convex/_generated # Auto-generated Convex types -- DO NOT edit
  hooks/            # Custom React hooks
  lib/              # Utility functions (cn())
  styles/           # Global CSS (Tailwind v4 theme via @theme inline {})
  env.ts            # Centralized env var validation (@t3-oss/env-nextjs + Zod)
  proxy.ts          # Clerk middleware (route protection)
```

`@/*` maps to `./src/*` -- always use `@/` imports for anything inside `src/`.

Convex functions live in `src/convex/` (set in `convex.json`), NOT a top-level `convex/` directory.

## Code Style

### Formatting (Prettier + ESLint enforced)

- **Double quotes** (`"`, not `'`), **semicolons** required, **2-space indent**
- **Trailing commas** in ES5 positions (objects, arrays, parameters)
- **Arrow callbacks** preferred (`prefer-arrow-callback` ESLint rule)
- **Template literals** preferred over string concatenation (`prefer-template`)

### Import Ordering (auto-sorted by `@trivago/prettier-plugin-sort-imports`)

Four groups separated by blank lines -- do not manually reorder:

```typescript
// 1. React / Next.js
import { useState } from "react";

// 2. Third-party modules
import { z } from "zod";

// 3. Internal aliases (@/)
import { Button } from "@/components/ui/button";

// 4. Relative imports
import { helper } from "./utils";
```

### Naming Conventions

| Item              | Convention                  | Example                      |
| ----------------- | --------------------------- | ---------------------------- |
| Files/directories | kebab-case                  | `convex-client-provider.tsx` |
| Components        | PascalCase named export     | `export function AppSidebar` |
| Hooks             | camelCase with `use` prefix | `useIsMobile`                |
| Utilities         | camelCase                   | `cn()`                       |
| Constants         | UPPER_SNAKE_CASE            | `MOBILE_BREAKPOINT`          |
| CSS variables     | kebab-case                  | `--font-sans`                |
| Convex tables     | camelCase                   | `users`, `internships`       |

### Component Patterns

- **Named exports**: `export function MyComponent()`. Exception: pages use `export default function Page()`.
- Add `"use client"` at the top of client components.
- Type props inline: `React.ComponentProps<"div">` or destructured object types. Avoid separate `interface` for simple props.
- Layouts: `Readonly<{ children: React.ReactNode }>`. Wrappers: `PropsWithChildren`.
- Spread remaining props: `function Comp({ className, ...props }: React.ComponentProps<"div">)`.
- Merge classes with `cn()` from `@/lib/utils`.
- Add `data-slot="name"` on shadcn components for CSS targeting.

### TypeScript

- **Strict mode** enabled. Never use `any` or `@ts-ignore`.
- Prefer inline types over separate type declarations for component props.
- Use `as const` for constant arrays/objects.
- Convex types: `Id<"tableName">`, `Doc<"tableName">`, `v.*` validators.

### Error Handling

- Convex functions: throw `ConvexError` from `convex/values` for user-facing errors. Validate all args with `v.*` validators (required for every function).
- Auth checks: call `ctx.auth.getUserIdentity()` and throw early if `null`.
- Client: handle loading/error states from `useQuery` (returns `undefined` while loading). Use `sonner` `toast.error()` for user-visible errors.

### Environment Variables

- **Never use `process.env`** in app code. ESLint rule `n/no-process-env` is enforced everywhere except `src/convex/` and `src/env.ts`.
- Access via the validated `env` object: `import { env } from "@/env"`.
- Add new vars to `src/env.ts` with Zod schemas.

## Convex Backend

Functions in `src/convex/`. See `.github/instructions/convex.instructions.md` for full patterns.

Key rules:

- Register with `query`/`mutation`/`action` (public) or `internalQuery`/`internalMutation`/`internalAction` (private). All from `src/convex/_generated/server`.
- **Always include `args` validators** -- even for empty args use `args: {}`.
- Reference: `api.module.fn` (public), `internal.module.fn` (internal).
- Call between functions: `ctx.runQuery(...)`, `ctx.runMutation(...)`, `ctx.runAction(...)`.
- Queries/mutations have `ctx.db` access. Actions do NOT -- they must call queries/mutations via `ctx.runQuery`/`ctx.runMutation`.
- Actions can use `"use node"` directive for Node.js APIs and network calls.
- Auth: `const identity = await ctx.auth.getUserIdentity(); if (!identity) throw new Error("Unauthenticated");`
- Schema: define in `src/convex/schema.ts` with `defineSchema`/`defineTable` from `convex/server`.
- `undefined` is not a valid Convex value -- use `null` instead.

## UI / Styling

- **Tailwind CSS v4** -- configured in `src/styles/globals.css` via `@theme inline {}`. No `tailwind.config` file.
- **shadcn/ui** -- add components: `pnpm dlx shadcn add <component>`. Never manually edit `src/components/ui/`.
- **Icons**: `lucide-react`.
- **Toasts**: `sonner` -- `toast()` / `toast.error()` / `toast.success()`.
- **Theming**: `next-themes` with `class` strategy. Light/dark vars in `globals.css` using `oklch()`.

## Next.js Configuration

- **React Compiler** enabled (`reactCompiler: true`). No manual memoization.
- **Typed routes** enabled (`typedRoutes: true`). Use `Route` type from `next` for links.
- **No API routes** -- backend is entirely Convex.
- Clerk middleware in `src/proxy.ts` protects non-public routes.

## Deployment

Hosted on **Vercel**. Build: `pnpm dlx convex deploy --cmd 'pnpm run build'`. Env vars: `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`.

## Copilot Instructions

Convex-specific guidelines are in `.github/instructions/convex.instructions.md` (applied to `**/*.ts,**/*.tsx,**/*.js,**/*.jsx`). It covers validators, function registration, queries vs mutations vs actions, schema definition, auth, file storage, scheduling, and full-text search. Read it before writing Convex functions.

## Common Pitfalls

1. **Do not edit** `src/components/ui/` or `src/convex/_generated/` -- they are auto-generated.
2. **Do not use `process.env`** outside `src/env.ts` and `src/convex/` -- linting will fail.
3. **Do not add** `useMemo`/`useCallback`/`memo` -- the React Compiler handles it.
4. **Convex functions** are in `src/convex/`, not a top-level `convex/` directory.
5. **`undefined` is not valid** in Convex -- use `null` for absent values.
6. **Always validate args** in Convex functions -- omitting `args` causes runtime errors.
7. Run `pnpm lint:fix && pnpm format` before committing.
