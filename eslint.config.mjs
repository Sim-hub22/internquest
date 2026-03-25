import convexPlugin from "@convex-dev/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import nodePlugin from "eslint-plugin-n";
import tailwindCanonicalClasses from "eslint-plugin-tailwind-canonical-classes";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...convexPlugin.configs.recommended,
  prettier,
  {
    plugins: {
      n: nodePlugin,
      "tailwind-canonical-classes": tailwindCanonicalClasses,
    },
    rules: {
      "prefer-arrow-callback": ["error"],
      "prefer-template": ["error"],
      semi: ["error"],
      quotes: ["error", "double"],
      "n/no-process-env": ["error"],
      "tailwind-canonical-classes/tailwind-canonical-classes": [
        "warn",
        {
          cssPath: "./src/styles/globals.css",
        },
      ],
    },
  },
  {
    files: ["src/convex/**/*", "src/env.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/convex/_generated",
    ".agents/**",
  ]),
]);

export default eslintConfig;
