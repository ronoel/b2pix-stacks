# B2PIX UI

Angular 21+ PIX↔Bitcoin exchange frontend.

## Stack

- Angular 21+ standalone components, signals, new control flow (`@if`, `@for`, `@switch`)
- TypeScript, SCSS, npm
- Dependency injection via `inject()` — never constructor injection
- Arrow functions supported in templates (e.g., `(click)="count.update(n => n + 1)"`)
- Do NOT import `CommonModule` — use new control flow and direct pipe/directive imports instead

## Commands

```bash
ng serve                              # dev server :4200
ng build --configuration production   # production build
ng test                               # run tests
ng lint                               # lint
```

## Key Directories

```
src/app/pages/         → route components (lazy-loaded)
src/app/components/    → reusable global components
src/app/shared/api/    → API services
src/app/shared/models/ → interfaces/types
src/app/libs/          → wallet, contracts, utilities
src/app/services/      → application services
src/styles/            → global SCSS + _shared-components.scss
```

## Critical Rules

- Code: English. UI text: Portuguese (pt-BR) **with proper accents** (é, ã, ç, ê, ó, í, ú, â, õ, etc.) — never omit diacritics
- BRL values in **cents** (`number`), BTC in **satoshis** (`number`)
- All components must be `standalone: true`
- Use signals (`signal()`, `computed()`) for state — no BehaviorSubject for new code
- Formatting: always `Intl.NumberFormat('pt-BR')`
- Separate file structure for components (HTML/SCSS/TS)
- Inline template OK only if < 50 lines
- **Scroll to top on page/step change**: When navigating to a new route or changing an in-component step (e.g., multi-step flows using a `step` signal), always ensure the page scrolls to the top. For route navigation use `scrollPositionRestoration: 'top'` in router config. For in-component step changes use an `effect()` on the step signal with `window.scrollTo({ top: 0 })`.

## Backend

Rust/Axum backend uses `u64` for monetary values. JS `number` is directly compatible.

## Extended Docs

Detailed patterns in `.claude/docs/`:
- `patterns.md` — component, service, and template patterns
- `styling.md` — colors, buttons, status badges, SCSS hierarchy
- `wallet.md` — wallet services, contracts, Clarity utilities
- `conventions.md` — data types, formatting, error handling, navigation
