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

No test framework is configured. When one is added, update this section with single-test commands.

## Pre-commit Hooks

Husky + lint-staged runs `eslint --fix` then `prettier --write` on staged `*.{ts,tsx,js,jsx,mdx}` files. Run `pnpm lint:fix && pnpm format` before committing to avoid hook failures.

## Project Structure

```
src/
  app/                # Next.js App Router
    (auth)/           # Sign-in, sign-up pages (Clerk)
    (protected)/      # Authenticated routes (dashboard, messages)
    (public)/         # Landing page
  components/         # Shared application components
  components/ui/      # shadcn/ui primitives -- DO NOT manually edit
  convex/             # Convex backend (queries, mutations, actions, schema)
  convex/_generated/  # Auto-generated Convex types -- DO NOT edit
  hooks/              # Custom React hooks (use-current-user, use-mobile)
  lib/                # Utility functions (cn())
  styles/globals.css  # Tailwind v4 theme via @theme inline {}
  env.ts              # Centralized env var validation (@t3-oss/env-nextjs + Zod)
  proxy.ts            # Clerk middleware (protects non-public routes)
```

- `@/*` maps to `./src/*` -- always use `@/` imports for anything inside `src/`.
- Convex functions live in `src/convex/` (set in `convex.json`), NOT a top-level `convex/` directory.

## Code Style

### Formatting (Prettier + ESLint enforced)

- **Double quotes** (`"`), **semicolons** required, **2-space indent**, **trailing commas** (ES5)
- **Arrow callbacks** required (`prefer-arrow-callback` ESLint rule)
- **Template literals** required over concatenation (`prefer-template` ESLint rule)
- Tailwind classes sorted by `prettier-plugin-tailwindcss` (with `cn` and `cva` functions)

### Import Ordering (auto-sorted by `@trivago/prettier-plugin-sort-imports`)

Four groups separated by blank lines -- do not manually reorder:

```typescript
// 1. React / Next.js
import { useState } from "react";

// 2. Third-party modules
import { v } from "convex/values";

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

- **Named exports**: `export function MyComponent()`. Pages use `export default function Page()`.
- Add `"use client"` directive at the top of client components.
- Type props inline: `React.ComponentProps<"div">` or destructured object types.
- Layouts: `Readonly<{ children: React.ReactNode }>`. Wrappers: `PropsWithChildren`.
- Spread remaining props and merge classes with `cn()` from `@/lib/utils`.
- Provider chain in root layout: ThemeProvider > ClerkProvider > ConvexClientProvider > TooltipProvider.

### TypeScript

- **Strict mode** enabled. Never use `any` or `@ts-ignore`.
- Prefer inline types over separate type declarations for simple component props.
- Use `as const` for constant arrays/objects.
- Convex types: `Id<"tableName">`, `Doc<"tableName">`, `v.*` validators.

### Error Handling

- **Convex functions**: throw `ConvexError` from `convex/values` for user-facing errors.
- **Auth checks**: `const identity = await ctx.auth.getUserIdentity(); if (!identity) throw new Error("Unauthenticated");`
- **Client**: `useQuery` returns `undefined` while loading -- handle loading states. Use `sonner` `toast.error()` for user-visible errors.

### Environment Variables

- **Never use `process.env`** in app code. ESLint rule `n/no-process-env` enforced everywhere except `src/convex/` and `src/env.ts`.
- Access via: `import { env } from "@/env"`. Add new vars to `src/env.ts` with Zod schemas.
- Required vars: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`.

## Convex Backend

**Read `.github/instructions/convex.instructions.md` before writing any Convex functions** -- it has comprehensive patterns for validators, queries, mutations, actions, pagination, auth, file storage, scheduling, and search.

Key rules:

- Register with `query`/`mutation`/`action` (public) or `internalQuery`/`internalMutation`/`internalAction` (private). All imported from `src/convex/_generated/server`.
- **Always include `args` validators** -- even for empty args use `args: {}`.
- Reference functions: `api.module.fn` (public), `internal.module.fn` (internal).
- Call between functions: `ctx.runQuery(...)`, `ctx.runMutation(...)`, `ctx.runAction(...)`.
- Queries/mutations have `ctx.db` access. Actions do NOT -- they must call queries/mutations.
- Actions can use `"use node"` directive for Node.js APIs and network calls.
- `undefined` is not a valid Convex value -- always use `null` for absent values.
- Schema defined in `src/convex/schema.ts` with `defineSchema`/`defineTable` from `convex/server`.
- Never accept `userId` as a function argument -- derive it from `ctx.auth.getUserIdentity()`.
- Avoid `.filter()` on query results -- use indexes defined in the schema instead.

## UI / Styling

- **Tailwind CSS v4** -- configured in `src/styles/globals.css` via `@theme inline {}`. No `tailwind.config` file.
- **shadcn/ui** -- install: `pnpm dlx shadcn add <component>`. Never manually edit `src/components/ui/`.
- **Icons**: `lucide-react`. **Toasts**: `sonner`. **Theming**: `next-themes` (class strategy, `oklch()` colors).
- Add `data-slot="name"` on shadcn components for CSS targeting.

## Next.js Configuration

- **React Compiler** enabled (`reactCompiler: true`). No manual memoization.
- **Typed routes** enabled (`typedRoutes: true`). Use `Route` type from `next` for links.
- **No API routes** -- backend is entirely Convex. HTTP endpoints in `src/convex/http.ts`.
- Clerk middleware in `src/proxy.ts`: public routes are `/`, `/sign-in(.*)`, `/sign-up(.*)`.

## Deployment

Hosted on **Vercel**. Build command: `pnpm dlx convex deploy --cmd 'pnpm run build'`. Required env vars: `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, plus all vars from `src/env.ts`.

## Common Pitfalls

1. **Do not edit** `src/components/ui/` or `src/convex/_generated/` -- they are auto-generated.
2. **Do not use `process.env`** outside `src/env.ts` and `src/convex/` -- linting will fail.
3. **Do not add** `useMemo`/`useCallback`/`memo` -- the React Compiler handles it.
4. **Convex functions** are in `src/convex/`, not a top-level `convex/` directory.
5. **`undefined` is not valid** in Convex -- use `null` for absent values.
6. **Always validate args** in Convex functions -- omitting `args` causes runtime errors.
7. **Never accept `userId`** as a Convex function argument -- always derive from auth context.
8. Run `pnpm lint:fix && pnpm format` before committing to pass pre-commit hooks.
