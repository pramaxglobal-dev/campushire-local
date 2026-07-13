# CAMPUSHIRE DESIGN SYSTEM V2 - DESIGN TOKENS

**Version:** 2.0.0  
**Status:** Draft  
**Last Updated:** 2026-07-06  
**Current Config:** `apps/web/tailwind.config.ts`

---

## OVERVIEW

Design tokens are the foundational design decisions that drive consistency across the entire product. They are the single source of truth for colors, typography, spacing, shadows, and other visual properties.

**Principles:**
1. **Single Source of Truth**: All tokens defined in `tailwind.config.ts`
2. **Semantic Naming**: Token names describe purpose, not appearance
3. **Scalable**: Support theming and white-label customization
4. **Composable**: Complex tokens built from primitive tokens

---

## COLOR SYSTEM

### Current State Analysis

**File:** `apps/web/tailwind.config.ts`

**Issues Found (P2 Audit):**
- ❌ `brand.navy` duplicates `primary.600`
- ❌ `brand.sky` duplicates `accent.500`
- ⚠️ Missing shades: primary (200, 300, 400, 800), accent (200, 300, 400, 700, 800, 900)
- ❌ Inconsistent usage: Mix of shaded (`bg-primary-700`) and default (`bg-primary`)

### Proposed Color System V2

#### 1. Primary Palette (Navy Blue - Brand Color)

**Purpose:** Primary actions, navigation, headers, brand elements

```typescript
primary: {
  50:  "#EEF2F9",  // Lightest - hover states, backgrounds
  100: "#D5E0F0",  // Very light - subtle backgrounds
  200: "#ABC1E1",  // Light - borders, disabled states
  300: "#81A2D2",  // Medium-light - secondary text
  400: "#5783C3",  // Medium - icons, less prominent text
  500: "#2E5EA8",  // Base - default primary color
  600: "#1B3A6B",  // Dark - primary buttons, strong emphasis (CURRENT DEFAULT)
  700: "#142C52",  // Darker - button hover states (CURRENT primary-700)
  800: "#0D1E39",  // Very dark - pressed states
  900: "#0A1829",  // Darkest - high contrast text
}
```

**Usage Guidelines:**
- **Buttons**: `bg-primary-600` (default), `hover:bg-primary-700`, `active:bg-primary-800`
- **Links**: `text-primary-600`, `hover:text-primary-700`
- **Borders**: `border-primary-200` (subtle), `border-primary-600` (prominent)
- **Backgrounds**: `bg-primary-50` (very subtle), `bg-primary-100` (subtle)
- **Sidebar**: `bg-primary-600` (main background), `hover:bg-primary-700`

#### 2. Accent Palette (Sky Blue - Interactive Elements)

**Purpose:** Focus states, interactive elements, informational highlights

```typescript
accent: {
  50:  "#F0F9FF",  // Lightest - info backgrounds
  100: "#E0F2FE",  // Very light - hover states
  200: "#BAE6FD",  // Light - borders
  300: "#7DD3FC",  // Medium-light - icons
  400: "#38BDF8",  // Medium - hover text
  500: "#0EA5E9",  // Base - default accent (CURRENT DEFAULT)
  600: "#0284C7",  // Dark - pressed states (CURRENT accent-600)
  700: "#0369A1",  // Darker - strong emphasis
  800: "#075985",  // Very dark - high contrast
  900: "#0C4A6E",  // Darkest - maximum contrast
}
```

**Usage Guidelines:**
- **Focus Rings**: `ring-accent-500`
- **Active States**: `bg-accent-500`, `text-white`
- **Info Badges**: `bg-accent-100`, `text-accent-800`, `border-accent-200`
- **Links (hover)**: `hover:text-accent-600`
- **Selected Items**: `bg-accent-50`, `border-accent-500`

#### 3. Semantic Colors (Status & Feedback)

**Success (Emerald Green):**
```typescript
success: {
  50:  "#ECFDF5",
  100: "#D1FAE5",
  200: "#A7F3D0",
  300: "#6EE7B7",
  400: "#34D399",
  500: "#10B981",
  600: "#059669",
  700: "#047857",
  800: "#065F46",
  900: "#064E3B",
}
```

**Usage:** Approved, active, verified, completed, hired states

**Warning (Amber Orange):**
```typescript
warning: {
  50:  "#FFFBEB",
  100: "#FEF3C7",
  200: "#FDE68A",
  300: "#FCD34D",
  400: "#FBBF24",
  500: "#F59E0B",
  600: "#D97706",
  700: "#B45309",
  800: "#92400E",
  900: "#78350F",
}
```

**Usage:** Pending, screening, on hold, rescheduled states

**Danger (Rose Red):**
```typescript
danger: {
  50:  "#FFF1F2",
  100: "#FFE4E6",
  200: "#FECDD3",
  300: "#FDA4AF",
  400: "#FB7185",
  500: "#F43F5E",
  600: "#E11D48",
  700: "#BE123C",
  800: "#9F1239",
  900: "#881337",
}
```

**Usage:** Rejected, expired, cancelled, failed, overdue states

**Info (Sky Blue - Same as Accent):**
```typescript
info: {
  // Use accent palette for info states
  50:  "#F0F9FF",
  100: "#E0F2FE",
  // ... same as accent
}
```

**Usage:** Applied, shortlisted, in progress, scheduled states

#### 4. Extended Semantic Colors (Additional Status)

**Violet (Offer States):**
```typescript
violet: {
  50:  "#F5F3FF",
  100: "#EDE9FE",
  200: "#DDD6FE",
  300: "#C4B5FD",
  400: "#A78BFA",
  500: "#8B5CF6",
  600: "#7C3AED",
  700: "#6D28D9",
  800: "#5B21B6",
  900: "#4C1D95",
}
```

**Usage:** Offered, triggered states

**Indigo (Interview States):**
```typescript
indigo: {
  50:  "#EEF2FF",
  100: "#E0E7FF",
  200: "#C7D2FE",
  300: "#A5B4FC",
  400: "#818CF8",
  500: "#6366F1",
  600: "#4F46E5",
  700: "#4338CA",
  800: "#3730A3",
  900: "#312E81",
}
```

**Usage:** Interview rounds (R1, R2, R3)

**Orange (Caution States):**
```typescript
orange: {
  50:  "#FFF7ED",
  100: "#FFEDD5",
  200: "#FED7AA",
  300: "#FDBA74",
  400: "#FB923C",
  500: "#F97316",
  600: "#EA580C",
  700: "#C2410C",
  800: "#9A3412",
  900: "#7C2D12",
}
```

**Usage:** Paused, disputed states

#### 5. Neutral Palette (Slate Gray)

**Purpose:** Text, borders, backgrounds, shadows

```typescript
slate: {
  50:  "#F8FAFC",  // Lightest - subtle backgrounds
  100: "#F1F5F9",  // Very light - hover backgrounds
  200: "#E2E8F0",  // Light - borders, dividers
  300: "#CBD5E1",  // Medium-light - disabled text
  400: "#94A3B8",  // Medium - placeholder text
  500: "#64748B",  // Base - secondary text
  600: "#475569",  // Dark - body text
  700: "#334155",  // Darker - headings
  800: "#1E293B",  // Very dark - strong headings
  900: "#0F172A",  // Darkest - maximum contrast
}
```

**Usage Guidelines:**
- **Body Text**: `text-slate-600`
- **Headings**: `text-slate-900` (h1, h2), `text-slate-700` (h3, h4)
- **Secondary Text**: `text-slate-500`
- **Disabled Text**: `text-slate-400`
- **Borders**: `border-slate-200` (default), `border-slate-300` (stronger)
- **Backgrounds**: `bg-slate-50` (subtle), `bg-slate-100` (cards)

#### 6. Remove Duplicate Brand Tokens

**Action: DELETE from tailwind.config.ts**
```typescript
// DELETE THIS - Causes confusion
brand: {
  navy: "#1B3A6B",  // Duplicate of primary.600
  sky: "#0EA5E9"    // Duplicate of accent.500
}
```

**Migration:**
```typescript
// OLD
className="bg-brand-navy"
className="text-brand-sky"

// NEW
className="bg-primary-600"
className="text-accent-500"
```

---

## TYPOGRAPHY SYSTEM

### Font Family

**Current:**
```typescript
fontFamily: {
  sans: ["Inter", ...fontFamily.sans]
}
```

**Keep:** Inter is excellent for UI/dashboard applications. No change needed.

### Font Size Scale

**Current Issue:** Inconsistent usage across pages. Some use `text-sm` for body, others use `text-base`.

**Proposed Scale:**

```typescript
fontSize: {
  xs:   ["0.75rem", { lineHeight: "1rem" }],    // 12px - Helper text, labels, timestamps
  sm:   ["0.875rem", { lineHeight: "1.25rem" }], // 14px - Dense UI, buttons, navigation
  base: ["1rem", { lineHeight: "1.5rem" }],      // 16px - Body text (DEFAULT)
  lg:   ["1.125rem", { lineHeight: "1.75rem" }], // 18px - Emphasized text, small headings
  xl:   ["1.25rem", { lineHeight: "1.75rem" }],  // 20px - Section headings (h4)
  "2xl": ["1.5rem", { lineHeight: "2rem" }],     // 24px - Page titles (h3)
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px - Large titles (h2)
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }],  // 36px - Hero text (h1)
}
```

**Usage Guidelines:**

| Element | Size | Class | Use Case |
|---------|------|-------|----------|
| Helper text | 12px | `text-xs` | Field hints, timestamps, badges |
| Dense UI | 14px | `text-sm` | Buttons, nav items, table cells, form inputs |
| Body text | 16px | `text-base` | Paragraphs, descriptions, card content |
| Emphasized | 18px | `text-lg` | Lead paragraphs, modal titles |
| h4 | 20px | `text-xl` | Section headings |
| h3 | 24px | `text-2xl` | Page headings, card titles |
| h2 | 30px | `text-3xl` | Dashboard page titles |
| h1 | 36px | `text-4xl` | Landing page hero, major headings |

**Stat Values Exception:**
```typescript
// For dashboard stat numbers only
"5xl": ["3rem", { lineHeight: "1" }],  // 48px - Large stats
"6xl": ["3.75rem", { lineHeight: "1" }], // 60px - Hero stats
```

### Font Weight Scale

```typescript
fontWeight: {
  normal: "400",  // Body text
  medium: "500",  // Emphasized text, button text
  semibold: "600", // Headings (h3, h4, h5, h6)
  bold: "700",    // Strong headings (h1, h2)
}
```

**Usage:**
- Body: `font-normal` (400)
- Buttons: `font-medium` (500)
- Headings: `font-semibold` (600) or `font-bold` (700)
- Labels: `font-medium` (500)

### Line Height Scale

**Included in fontSize above**, but standalone tokens:

```typescript
lineHeight: {
  tight: "1.25",   // Headings
  normal: "1.5",   // Body text (DEFAULT)
  relaxed: "1.75", // Large body text
}
```

---

## SPACING SYSTEM

### Current Issue

**P2 Audit Finding:** No semantic spacing scale. Arbitrary values everywhere.

**Evidence:**
- Cards use: p-3, p-4, p-5, p-6 (all four!)
- No `space-card`, `space-section` tokens
- Developers guess spacing values

### Proposed Spacing Scale

**Base Scale (Tailwind defaults - KEEP):**
```typescript
spacing: {
  0: "0px",
  0.5: "0.125rem",  // 2px
  1: "0.25rem",     // 4px
  1.5: "0.375rem",  // 6px
  2: "0.5rem",      // 8px
  2.5: "0.625rem",  // 10px
  3: "0.75rem",     // 12px
  3.5: "0.875rem",  // 14px
  4: "1rem",        // 16px
  5: "1.25rem",     // 20px
  6: "1.5rem",      // 24px
  7: "1.75rem",     // 28px
  8: "2rem",        // 32px
  10: "2.5rem",     // 40px
  12: "3rem",       // 48px
  16: "4rem",       // 64px
  20: "5rem",       // 80px
  24: "6rem",       // 96px
}
```

**Semantic Spacing Tokens (NEW):**

Add to `theme.extend.spacing`:

```typescript
spacing: {
  // Component spacing
  "component-xs": "0.75rem",   // 12px - Compact button padding
  "component-sm": "1rem",      // 16px - Default button padding
  "component-md": "1.25rem",   // 20px - Card padding (STANDARD)
  "component-lg": "1.5rem",    // 24px - Modal padding
  
  // Layout spacing
  "section-sm": "2rem",        // 32px - Tight section spacing
  "section-md": "3rem",        // 48px - Default section spacing
  "section-lg": "4rem",        // 64px - Large section spacing
  
  // Stack spacing
  "stack-xs": "0.25rem",       // 4px - Very tight (form label → input)
  "stack-sm": "0.5rem",        // 8px - Tight (list items)
  "stack-md": "1rem",          // 16px - Default (cards in list)
  "stack-lg": "1.5rem",        // 24px - Relaxed (page sections)
  "stack-xl": "2rem",          // 32px - Very relaxed (major sections)
}
```

**Usage Guidelines:**

```tsx
// Card padding - ALWAYS use component-md (20px)
<CardContent className="p-component-md">

// Button padding
<Button size="sm" className="px-component-xs">  // 12px
<Button size="md" className="px-component-sm">  // 16px (default)
<Button size="lg" className="px-component-md">  // 20px

// Stack spacing
<Stack spacing="md">  // Generates gap-stack-md (16px)

// Section spacing
<section className="py-section-md">  // 48px vertical padding
```

---

## BORDER RADIUS SYSTEM

### Current State

**File:** `apps/web/tailwind.config.ts`

**Custom Tokens Defined:**
```typescript
borderRadius: {
  xl: "0.75rem",   // 12px
  "2xl": "1rem",   // 16px
  "3xl": "1.5rem"  // 24px
}
```

**Issue:** Custom tokens rarely used. Components use Tailwind defaults (`rounded-md`, `rounded-lg`).

### Proposed System

**Keep Tailwind Defaults:**
```typescript
borderRadius: {
  none: "0px",
  sm: "0.125rem",  // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem",  // 6px - Buttons, inputs
  lg: "0.5rem",    // 8px - Cards, modals (MOST COMMON)
  xl: "0.75rem",   // 12px - Special cards
  "2xl": "1rem",   // 16px - Rare
  "3xl": "1.5rem", // 24px - Rare
  full: "9999px"   // Pills, avatars, badges
}
```

**Usage Guidelines:**

| Element | Radius | Class | Rationale |
|---------|--------|-------|-----------|
| Buttons | 6px | `rounded-md` | Subtle, modern |
| Inputs | 6px | `rounded-md` | Match buttons |
| Cards | 8px | `rounded-lg` | Standard, not too rounded |
| Modals | 8px | `rounded-lg` | Match cards |
| Badges | Full | `rounded-full` | Pills |
| Avatars | Full | `rounded-full` | Circles |
| Images | 8px | `rounded-lg` | Match cards |
| Skeleton | 8px | `rounded-lg` | Match real content |

**Consistency Rule:** If unsure, use `rounded-lg` (8px).

---

## SHADOW SYSTEM

### Current State

**Custom Shadows Defined:**
```typescript
boxShadow: {
  card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  "card-hover": "0 4px 12px rgba(0,0,0,0.10)",
  nav: "0 2px 8px rgba(27,58,107,0.12)"
}
```

**Issue:** Card component uses `shadow-sm` (Tailwind default) instead of `shadow-card`.

### Proposed Shadow System

**Replace Tailwind defaults with custom shadows:**

```typescript
boxShadow: {
  // Base shadows
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.04)",  // Subtle elevation
  DEFAULT: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", // Standard
  md: "0 4px 12px rgba(0,0,0,0.08)",  // Elevated
  lg: "0 8px 24px rgba(0,0,0,0.10)",  // High elevation
  xl: "0 16px 48px rgba(0,0,0,0.12)", // Very high elevation
  
  // Semantic shadows
  card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",  // STANDARD CARD
  "card-hover": "0 4px 12px rgba(0,0,0,0.10)",  // Card hover state
  modal: "0 16px 48px rgba(0,0,0,0.12)",  // Modals, overlays
  nav: "0 2px 8px rgba(27,58,107,0.12)",  // Navigation active state
  dropdown: "0 8px 24px rgba(0,0,0,0.10)", // Dropdowns, menus
}
```

**Usage Guidelines:**

| Element | Shadow | Class | Use Case |
|---------|--------|-------|----------|
| Cards | Standard | `shadow-card` | All card components |
| Cards (hover) | Elevated | `hover:shadow-card-hover` | Clickable cards |
| Modals | Very high | `shadow-modal` | Overlays |
| Dropdowns | High | `shadow-dropdown` | Select menus, popovers |
| Nav (active) | Custom | `shadow-nav` | Active nav items |
| Inputs | Subtle | `shadow-sm` | Form inputs |
| Buttons | None | `shadow-none` | Buttons rely on color |

**Migration:**
```tsx
// OLD - Inconsistent
<Card className="shadow-sm">  // Wrong

// NEW - Consistent
<Card className="shadow-card">  // Correct, matches design system
```

---

## Z-INDEX SYSTEM

**Current:** No documented z-index scale, leading to `z-50`, `z-40` guessing.

**Proposed Scale:**

```typescript
zIndex: {
  0: "0",
  10: "10",      // Dropdown menus
  20: "20",      // Sticky headers
  30: "30",      // Tooltips
  40: "40",      // Modals backdrop
  50: "50",      // Modals content
  60: "60",      // Toasts
  70: "70",      // Loading overlays
  80: "80",      // Critical alerts
  90: "90",      // Debug tools
  100: "100",    // Accessibility focus outlines
}
```

**Semantic Names (add to extend):**

```typescript
zIndex: {
  dropdown: "10",
  sticky: "20",
  tooltip: "30",
  "modal-backdrop": "40",
  modal: "50",
  toast: "60",
  overlay: "70",
  alert: "80",
}
```

---

## ANIMATION SYSTEM

### Current State

**Animations Defined:**
```typescript
animation: {
  "fade-in": "fadeIn 0.2s ease-out",
  "slide-up": "slideUp 0.3s ease-out",
  shimmer: "shimmer 1.5s infinite"
}

keyframes: {
  fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
  slideUp: {
    from: { opacity: "0", transform: "translateY(8px)" },
    to: { opacity: "1", transform: "translateY(0)" }
  },
  shimmer: { 
    "0%": { backgroundPosition: "-200% 0" }, 
    "100%": { backgroundPosition: "200% 0" } 
  }
}
```

**Status:** Good foundation. Expand for more patterns.

### Proposed Animation System

**Duration Tokens:**
```typescript
transitionDuration: {
  fast: "150ms",     // Micro-interactions (hover, focus)
  base: "200ms",     // Default transitions
  slow: "300ms",     // Complex animations
  slower: "500ms",   // Large animations
}
```

**Easing Tokens:**
```typescript
transitionTimingFunction: {
  "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",  // Default
  "ease-out": "cubic-bezier(0, 0, 0.2, 1)",  // Entrances
  "ease-in": "cubic-bezier(0.4, 0, 1, 1)",   // Exits
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",  // Playful
}
```

**New Animations:**
```typescript
animation: {
  // Existing
  "fade-in": "fadeIn 0.2s ease-out",
  "slide-up": "slideUp 0.3s ease-out",
  shimmer: "shimmer 1.5s infinite",
  
  // NEW
  "slide-down": "slideDown 0.3s ease-out",
  "slide-left": "slideLeft 0.3s ease-out",
  "slide-right": "slideRight 0.3s ease-out",
  "scale-in": "scaleIn 0.2s ease-out",
  "spin": "spin 1s linear infinite",
  "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
}

keyframes: {
  // Existing
  fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
  slideUp: {
    from: { opacity: "0", transform: "translateY(8px)" },
    to: { opacity: "1", transform: "translateY(0)" }
  },
  shimmer: { 
    "0%": { backgroundPosition: "-200% 0" }, 
    "100%": { backgroundPosition: "200% 0" } 
  },
  
  // NEW
  slideDown: {
    from: { opacity: "0", transform: "translateY(-8px)" },
    to: { opacity: "1", transform: "translateY(0)" }
  },
  slideLeft: {
    from: { opacity: "0", transform: "translateX(8px)" },
    to: { opacity: "1", transform: "translateX(0)" }
  },
  slideRight: {
    from: { opacity: "0", transform: "translateX(-8px)" },
    to: { opacity: "1", transform: "translateX(0)" }
  },
  scaleIn: {
    from: { opacity: "0", transform: "scale(0.95)" },
    to: { opacity: "1", transform: "scale(1)" }
  },
  spin: {
    to: { transform: "rotate(360deg)" }
  },
  pulse: {
    "0%, 100%": { opacity: "1" },
    "50%": { opacity: "0.5" }
  },
}
```

---

## BREAKPOINT SYSTEM

**Current (Tailwind Defaults):**
```typescript
screens: {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
}
```

**Status:** Keep defaults. Well-established, widely understood.

**Usage Guidelines:**

| Breakpoint | Width | Device | Common Usage |
|------------|-------|--------|--------------|
| < sm | 0-639px | Mobile | Single column, stacked layouts |
| sm | 640-767px | Large mobile | 2 columns, compact tables |
| md | 768-1023px | Tablet | 2-3 columns, show sidebar |
| lg | 1024-1279px | Desktop | 3-4 columns, full layout |
| xl | 1280-1535px | Large desktop | 4+ columns, dashboard grids |
| 2xl | 1536px+ | Ultra-wide | Maximum 6 columns, spacious |

**Mobile-First Approach:**
```tsx
// Start with mobile styles, enhance for larger screens
<div className="
  grid grid-cols-1           // Mobile: 1 column
  md:grid-cols-2             // Tablet: 2 columns
  xl:grid-cols-3             // Desktop: 3 columns
">
```

---

## WHITE-LABEL THEMING TOKENS

**Future Requirement:** Support customer-specific branding.

**Customizable Tokens:**
```typescript
theme: {
  colors: {
    primary: { /* Customer brand color */ },
    accent: { /* Customer accent color */ },
    // Semantic colors cannot be customized (accessibility)
  },
  fontFamily: {
    sans: { /* Customer font, fallback to Inter */ },
  },
  borderRadius: {
    // Customer can choose "sharp" (2px), "soft" (8px), or "round" (12px)
  },
}
```

**Non-Customizable (Locked for Consistency):**
- Semantic colors (success, warning, danger, info)
- Spacing scale
- Shadow system
- Z-index scale
- Animation system

---

## DESIGN TOKEN FILE STRUCTURE

**Recommended Organization:**

```
apps/web/
├── tailwind.config.ts          // Main config
└── design-tokens/
    ├── colors.ts               // Color palette exports
    ├── typography.ts           // Font scales
    ├── spacing.ts              // Spacing scale
    ├── shadows.ts              // Shadow definitions
    ├── animations.ts           // Animation/keyframes
    └── index.ts                // Aggregate exports
```

**Benefits:**
- Easier to maintain
- Easier to test
- Easier to document
- Can export for Figma plugin
- Can version independently

---

**END OF DESIGN TOKENS**

**Next Document**: `04_COMPONENT_ARCHITECTURE.md`
