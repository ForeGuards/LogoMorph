// ESLint v9 Flat Config for LogoMorph monorepo (Bun + TypeScript + Next.js)
// - Migrated from .eslintrc.json to eslint.config.js
// - Keeps parity with previous config: `eslint:recommended` + `plugin:@typescript-eslint/recommended`
// - Prettier is run separately via lint-staged; we intentionally do not load `eslint-config-prettier`
//   to avoid adding new deps in this step.
//
// Options considered:
// - Option 1: Use `@eslint/js` + `typescript-eslint` meta package (pros: first-class flat config; cons: adds deps)
// - Option 2: Use FlatCompat to reuse existing extends (pros: no new deps; cons: slightly less explicit)
// - Chosen: FlatCompat for minimal change and zero new dependencies.

import { FlatCompat } from '@eslint/eslintrc';

// Resolve legacy extends like "eslint:recommended" and "plugin:@typescript-eslint/recommended"
const compat = new FlatCompat();

export default [
  // Ignore generated and build output
  {
    ignores: ['node_modules/', 'dist/', 'build/', '.next/', 'convex/_generated/'],
  },

  // Equivalent to extends: ["eslint:recommended"]
  ...compat.extends('eslint:recommended'),

  // Equivalent to extends: ["plugin:@typescript-eslint/recommended"]
  // This also sets the parser to @typescript-eslint/parser for TS files
  ...compat.extends('plugin:@typescript-eslint/recommended'),
];
