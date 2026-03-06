# AGENTS.md - InternQuest

## Project Overview

InternQuest is an internship-finding platform built with **Next.js 16**, **React 19**, **Convex** (backend/database), **Tailwind CSS v4**, and **shadcn/ui**. The package manager is **pnpm**. The React Compiler is enabled so manual memoization (`memo`, `useMemo`, `useCallback`) is unnecessary.

## Build / Lint / Format Commands

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

## Testing

No test framework is configured yet. When tests are added, update this section.

## Pre-commit Hooks

Husky + lint-staged runs on every commit:

- `eslint --fix` on staged `*.{ts,tsx,js,jsx,mdx}` files
- `prettier --write` on staged `*.{ts,tsx,js,jsx,mdx}` files

All code must pass lint and format checks before commit.

## Project Structure

```
src/
  app/              # Next.js App Router (pages, layouts, route groups)
  components/       # Shared application components
  components/ui/    # shadcn/ui primitives (DO NOT manually edit)
  convex/           # Convex backend functions (queries, mutations, actions)
  convex/_generated # Auto-generated Convex types (DO NOT edit)
  hooks/            # Custom React hooks
  lib/              # Utility functions (e.g. cn())
  styles/           # Global CSS (Tailwind v4 theme config)
  env.ts            # Centralized environment variable validation
```

Key: Convex functions live in `src/convex/` (configured in `convex.json`), NOT a top-level `convex/` directory.

## Path Aliases

`@/*` maps to `./src/*`. Always use `@/` for imports from `src/`.

## Code Style

### Formatting (enforced by Prettier + ESLint)

- **Double quotes** everywhere (`"`, not `'`)
- **Semicolons** required at end of statements
- **2-space indentation**
- **Trailing commas** in ES5 positions (objects, arrays, parameters)
- **Arrow callbacks** preferred over `function` expressions in callbacks (`prefer-arrow-callback`)
- **Template literals** preferred over string concatenation (`prefer-template`)

### Import Ordering (enforced by `@trivago/prettier-plugin-sort-imports`)

Imports are auto-sorted into 4 groups separated by blank lines:

```typescript
// 1. React / Next.js
import Link from "next/link";
import { useState } from "react";

// 2. Third-party modules
import { ConvexProvider } from "convex/react";
import { z } from "zod";

// 3. Internal aliases (@/)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. Relative imports
import { something } from "./utils";
```

Specifiers within each import are sorted alphabetically. Do not manually reorder imports -- Prettier handles it.

### Naming Conventions

| Item              | Convention                  | Example                                  |
| ----------------- | --------------------------- | ---------------------------------------- |
| Files/directories | kebab-case                  | `convex-client-provider.tsx`             |
| Components        | PascalCase function         | `export function ConvexClientProvider()` |
| Hooks             | camelCase with `use` prefix | `useIsMobile`                            |
| Utilities         | camelCase                   | `cn()`                                   |
| Constants         | UPPER_SNAKE_CASE            | `MOBILE_BREAKPOINT`                      |
| CSS variables     | kebab-case                  | `--font-sans`                            |
| Convex tables     | camelCase                   | `users`, `internships`                   |

### Component Patterns

- Use **named exports** for components: `export function MyComponent()`. Exception: page components use `export default function Page()`.
- Add `"use client"` directive at the top of client components.
- Type props inline using `React.ComponentProps<"element">` or destructured types. Avoid creating separate `interface` declarations for simple props.
- Use `Readonly<{ children: React.ReactNode }>` for layout props.
- Use `PropsWithChildren` from React for simple wrapper components.
- Spread remaining props: `function Comp({ className, ...props }: React.ComponentProps<"div">)`.
- Use `cn()` from `@/lib/utils` to merge Tailwind classes.
- Add `data-slot="name"` attributes on shadcn components for CSS targeting.

### TypeScript

- **Strict mode** is enabled. Do not use `any` or `@ts-ignore`.
- Prefer inline types over separate type declarations for component props.
- Use `as const` for constant arrays/objects.
- For Convex types use: `Id<"tableName">`, `Doc<"tableName">`, `v.*` validators.

### Environment Variables

- **Never use `process.env` directly** in application code. The ESLint rule `n/no-process-env` is enforced everywhere except `src/convex/` and `src/env.ts`.
- Access env vars through the validated `env` object from `@/env`:
  ```typescript
  import { env } from "@/env";

  env.NEXT_PUBLIC_CONVEX_URL;
  ```
- Add new env vars to `src/env.ts` with Zod validation using `@t3-oss/env-nextjs`.

## Convex Backend

Convex functions are in `src/convex/`. Key patterns:

- Register functions with `query`, `mutation`, `action` from `src/convex/_generated/server`.
- Use `internal` functions for server-only logic (not exposed to client).
- Validate args with `v.*` validators from `convex/values`.
- Reference functions via `api.module.functionName` (public) or `internal.module.functionName` (internal).
- Call other functions within functions: `ctx.runQuery(internal.module.fn, args)`, `ctx.runMutation(...)`, `ctx.runAction(...)`.
- Use `ctx.auth.getUserIdentity()` for authentication checks.
- For detailed Convex patterns, see `.github/instructions/convex.instructions.md`.

## UI / Styling

- **Tailwind CSS v4** -- configured entirely in `src/styles/globals.css` using `@theme inline {}`. No `tailwind.config` file.
- **shadcn/ui** (radix-nova style) -- components in `src/components/ui/`. Add new components via `pnpm dlx shadcn add <component>`. Do not manually edit generated UI components.
- **Icons**: `lucide-react` -- import from `lucide-react`.
- **Toast notifications**: `sonner` -- use `toast()` from `sonner`.
- **Theming**: `next-themes` with `class` strategy, system default. Light/dark vars defined in `globals.css`.
- Colors use `oklch()` color space via CSS custom properties.

## Next.js Configuration

- **React Compiler** is enabled (`reactCompiler: true` in `next.config.ts`). Do not add manual `memo()`, `useMemo()`, or `useCallback()` wrappers.
- **Typed routes** are enabled (`typedRoutes: true`). Use `Route` type from `next` for type-safe links.
- There are **no API routes** -- the backend is entirely Convex.
- There is **no middleware** file yet.

## Deployment

- Hosted on **Vercel**. Build command: `pnpm dlx convex deploy --cmd 'pnpm run build'`.
- Convex deployment is configured via `CONVEX_DEPLOYMENT` and `CONVEX_DEPLOY_KEY` env vars.

## Common Pitfalls

1. Do not edit files in `src/components/ui/` or `src/convex/_generated/` -- they are auto-generated.
2. Do not use `process.env` outside `src/env.ts` and `src/convex/` -- it will fail linting.
3. Do not add `useMemo`/`useCallback`/`memo` -- the React Compiler handles optimization.
4. Convex functions are in `src/convex/`, not a top-level `convex/` directory.
5. Run `pnpm lint:fix && pnpm format` before committing to avoid pre-commit hook failures.
