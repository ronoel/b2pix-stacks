# CLAUDE.md - B2PIX UI Development Guide

This file contains the coding preferences and standards for the B2PIX UI project, an Angular application for buying and selling Bitcoin via PIX.

## Tech Stack

- **Framework**: Angular 19+ (standalone components)
- **Language**: TypeScript
- **Styling**: SCSS
- **Package Manager**: npm

## File Structure

### Components

Components should follow a separate file structure:

```
src/app/pages/[component-name]/
├── [component-name].component.ts
├── [component-name].component.html
├── [component-name].component.scss
└── components/                        # Subcomponents (when needed)
    └── [sub-component].component.ts
```

**Exception**: Very simple components or subcomponents can use inline templates when the HTML is small (< 50 lines).

### Subcomponent Hierarchy

When a component only exists within another, create it inside the parent component's folder:

```
src/app/pages/pix-validation/
├── pix-validation.component.ts
├── pix-validation.component.html
├── pix-validation.component.scss
└── components/
    ├── pix-timer.component.ts
    └── pix-key-input.component.ts
```

## Angular Code Patterns

### Standalone Components

All components must be standalone:

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, ...],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
```

### Signals (Modern Reactivity)

Use Angular signals for state management:

```typescript
// Component state
isLoading = signal(false);
userData = signal<User | null>(null);
errorMessage = signal('');

// Computed signals for derived values
totalAmount = computed(() => this.items().reduce((sum, item) => sum + item.value, 0));
```

### Dependency Injection

Use `inject()` instead of constructor injection:

```typescript
export class ExampleComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  private walletService = inject(WalletManagerService);
}
```

### Control Flow in Templates

Use Angular's new control flow syntax:

```html
<!-- Conditional -->
@if (isLoading()) {
  <div class="loading">Loading...</div>
} @else if (error()) {
  <div class="error">{{ error() }}</div>
} @else {
  <div class="content">{{ data() }}</div>
}

<!-- Loop -->
@for (item of items(); track item.id) {
  <div class="item">{{ item.name }}</div>
}
```

### Lifecycle Hooks

Implement lifecycle interfaces when needed:

```typescript
export class ExampleComponent implements OnInit, OnDestroy {
  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
```

## Styling

### Primary Color Palette

```scss
// Primary colors
$primary-blue: #1E40AF;
$primary-blue-light: #3B82F6;
$primary-blue-dark: #1D4ED8;

// Bitcoin/Action
$bitcoin-orange: #F59E0B;
$bitcoin-orange-dark: #D97706;

// Success
$success-green: #16A34A;
$success-green-light: #22C55E;
$success-green-dark: #15803D;

// Text
$text-primary: #1F2937;
$text-secondary: #6B7280;
$text-muted: #9CA3AF;

// Backgrounds
$bg-primary: #FFFFFF;
$bg-secondary: #F8FAFC;
$bg-elevated: #F9FAFB;

// Borders
$border-color: #E5E7EB;
$border-color-light: #F3F4F6;
```

### Style Hierarchy

1. **Global** (`src/styles.scss`): Reset, CSS variables, base typography
2. **Shared** (`src/styles/_shared-components.scss`): Buttons, badges, forms, loading states
3. **Component** (`*.component.scss`): Component-specific styles

### When to Abstract to Shared Styles

Move to `_shared-components.scss` when:
- The style is used in 2+ components
- It's a common UI pattern (buttons, cards, badges, inputs)
- It's a common state (loading, empty, error)

Keep in component when:
- It's component-specific layout
- It's unique variations of common styles
- It's component-specific positioning/grid

### Standard Button Classes

```scss
.btn { /* base */ }
.btn-primary { /* primary action - blue */ }
.btn-success { /* confirmation - green */ }
.btn-outline { /* secondary - border */ }
.btn-ghost { /* tertiary - no border */ }
.btn-lg { /* large size */ }
.btn-sm { /* small size */ }
```

### Status Classes

```scss
.status-badge.completed { /* green */ }
.status-badge.pending { /* blue */ }
.status-badge.processing { /* yellow */ }
.status-badge.warning { /* red */ }
.status-badge.failed { /* red */ }
```

## Best Practices

### Clean Code

- **Don't create unnecessary functions**: Avoid premature abstractions
- **Descriptive names**: Functions and variables with clear English names
- **Comments**: Only when the logic is not obvious
- **DRY**: Extract duplicated code only when used 3+ times

### Value Formatting

Use consistent methods for formatting:

```typescript
// BRL Currency
formatBRLCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valueInCents / 100);
}

// Bitcoin
formatSatoshisToBTC(satoshis: number): string {
  return (satoshis / 100000000).toFixed(8);
}

// Satoshis with thousand separator
formatSats(sats: number): string {
  return new Intl.NumberFormat('pt-BR').format(sats);
}

// Date/Time
formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}
```

### Error Handling

```typescript
this.service.getData().subscribe({
  next: (data) => {
    this.data.set(data);
    this.isLoading.set(false);
  },
  error: (error) => {
    console.error('Error loading data:', error);
    this.errorMessage.set(error.message || 'Error loading data');
    this.isLoading.set(false);
  }
});
```

### Navigation

```typescript
// Use injected Router
private router = inject(Router);

goToDashboard() {
  this.router.navigate(['/dashboard']);
}

goToDetails(id: string) {
  this.router.navigate(['/details', id]);
}
```

## Directory Structure

```
src/
├── app/
│   ├── components/          # Reusable global components
│   ├── pages/               # Application pages/routes
│   │   └── [page]/
│   │       ├── components/  # Page subcomponents
│   │       └── *.component.*
│   ├── services/            # Application services
│   ├── shared/
│   │   ├── api/             # API services
│   │   └── models/          # Interfaces and types
│   └── libs/                # Internal libraries (wallet, etc)
├── styles/
│   └── _shared-components.scss
├── styles.scss
└── environments/
```

## Language

- **Code**: English (variables, functions, classes)
- **UI/Text**: Portuguese (labels, messages, buttons)
- **Comments**: Portuguese when necessary

## Useful Commands

```bash
# Development
ng serve

# Production build
ng build --configuration production

# Tests
ng test

# Lint
ng lint
```
