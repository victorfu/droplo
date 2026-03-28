# Droplo Project Guidelines

## Code Standards

### TypeScript Required
All source code in `src/` MUST use TypeScript:
- Components and pages: `.tsx` files
- Hooks, utilities, and libraries: `.ts` files
- Shared type definitions in `src/types/index.ts`
- `tsconfig.json` with `strict: true`
- No `any` types unless browser APIs genuinely lack types (must be documented with comment)

### Tech Stack
- React 19 + TypeScript
- Vite 8 with `@tailwindcss/vite`
- Tailwind CSS v4 (via `@theme` in `index.css`, no `tailwind.config.js`)
- Firebase (Firestore, Storage, Hosting)
- Framer Motion for animations

### Out of Scope for TypeScript
- `functions/index.js` — separate Firebase Cloud Functions deployment with its own `package.json`
- `vite.config.js` — Vite natively supports both `.js` and `.ts` configs
