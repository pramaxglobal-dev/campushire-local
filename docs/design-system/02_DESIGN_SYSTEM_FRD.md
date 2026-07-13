# CAMPUSHIRE DESIGN SYSTEM V2 - FUNCTIONAL REQUIREMENTS DOCUMENT

**Version:** 2.0.0  
**Status:** Draft  
**Last Updated:** 2026-07-06  
**References:** `01_DESIGN_SYSTEM_PRD.md`

---

## TABLE OF CONTENTS

1. [Component Specifications](#component-specifications)
2. [API Definitions](#api-definitions)
3. [Behavior Specifications](#behavior-specifications)
4. [Interaction Patterns](#interaction-patterns)
5. [Validation Rules](#validation-rules)
6. [Error Handling](#error-handling)

---

## COMPONENT SPECIFICATIONS

### 1. BUTTON COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/button.tsx`

**Existing Variants:**
- `default`: Primary action (bg-primary-700)
- `destructive`: Dangerous action (bg-rose-600)
- `outline`: Secondary action (border + bg-white)
- `ghost`: Tertiary action (hover only)
- `link`: Text link with underline

**Existing Sizes:**
- `sm`: h-8 px-3
- `md`: h-10 px-4 (default)
- `lg`: h-12 px-6

#### Required Enhancements

**New Variants:**
```typescript
variant: {
  default: "bg-primary-700 text-white hover:bg-primary-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  destructive: "bg-rose-600 text-white hover:bg-rose-700",
  outline: "border border-slate-300 bg-white hover:bg-slate-50",
  ghost: "hover:bg-slate-100",
  link: "text-primary-700 underline-offset-4 hover:underline"
}
```

**New Props:**
```typescript
interface ButtonProps {
  // Existing
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  
  // NEW: Loading state
  loading?: boolean;
  loadingText?: string;
  
  // NEW: Icon support
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  iconOnly?: boolean;
}
```

**Loading State Behavior:**
- When `loading={true}`:
  - Display spinner (left of text)
  - Disable button automatically
  - Replace text with `loadingText` if provided
  - Maintain button width (no layout shift)

**Icon Support:**
- `iconLeft`: Icon before text
- `iconRight`: Icon after text
- `iconOnly`: Icon without text (requires aria-label)
- Icon size: 16px for sm, 18px for md, 20px for lg
- Icon color: Inherits from button text color

**Accessibility:**
- `disabled` buttons have `aria-disabled="true"`
- `loading` buttons have `aria-busy="true"`
- `iconOnly` buttons require `aria-label` prop

**Usage Example:**
```tsx
// Loading state
<Button loading loadingText="Saving...">Save</Button>

// With icons
<Button iconLeft={Plus}>Add Job</Button>
<Button iconRight={ExternalLink}>View Details</Button>

// Icon only
<Button iconOnly aria-label="Delete"><Trash /></Button>
```

---

### 2. BADGE COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/badge.tsx`

**Existing Variants:**
- `default`: Neutral (slate)
- `success`: Positive (emerald)
- `warning`: Caution (amber)
- `danger`: Negative (rose)
- `info`: Informational (sky)

#### Required Enhancements

**Fix Status Color Alignment:**
The `getStatusColor()` utility in `packages/utils/src/index.ts` returns classes like `"bg-emerald-100 text-emerald-800"`, but Badge component uses variants. This creates inconsistency.

**Solution: Add Status Variant Mapping**
```typescript
// New variants to match getStatusColor() outputs
variant: {
  default: "border-slate-200 bg-slate-100 text-slate-800",
  success: "border-emerald-200 bg-emerald-100 text-emerald-800",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
  danger: "border-rose-200 bg-rose-100 text-rose-800",
  info: "border-sky-200 bg-sky-100 text-sky-800",
  
  // NEW: Additional status colors
  violet: "border-violet-200 bg-violet-100 text-violet-800",
  indigo: "border-indigo-200 bg-indigo-100 text-indigo-800",
  orange: "border-orange-200 bg-orange-100 text-orange-800",
}
```

**New Props:**
```typescript
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "violet" | "indigo" | "orange";
  size?: "sm" | "md"; // NEW
  removable?: boolean; // NEW
  onRemove?: () => void; // NEW
}
```

**Size Variants:**
- `sm`: px-2 py-0.5 text-xs (current default)
- `md`: px-2.5 py-1 text-sm

**Removable Badge:**
- When `removable={true}`, show X icon on right
- Clicking X calls `onRemove()`
- X icon has hover state
- Keyboard accessible (Enter/Space to remove)

**Update getStatusColor() Function:**
```typescript
// Instead of returning classes, return variant name
export const getStatusVariant = (status: string): BadgeVariant => {
  const normalized = status.toLowerCase();
  
  const variantMap: Record<string, BadgeVariant> = {
    // Success states
    accepted: "success",
    hired: "success",
    active: "success",
    approved: "success",
    verified: "success",
    completed: "success",
    confirmed: "success",
    paid: "success",
    ongoing: "success",
    
    // Warning states
    screening: "warning",
    pending: "warning",
    pending_approval: "warning",
    on_hold: "warning",
    requested: "warning",
    rescheduled: "warning",
    
    // Danger states
    rejected: "danger",
    expired: "danger",
    cancelled: "danger",
    overdue: "danger",
    failed: "danger",
    
    // Info states
    applied: "info",
    shortlisted: "info",
    in_progress: "info",
    scheduled: "info",
    upcoming: "info",
    sent: "info",
    
    // Violet states
    offered: "violet",
    triggered: "violet",
    
    // Indigo states
    interview_r1: "indigo",
    interview_r2: "indigo",
    interview_r3: "indigo",
    
    // Orange states
    paused: "orange",
    disputed: "orange",
    
    // Default
    default: "default",
    draft: "default",
    withdrawn: "default",
    disconnected: "default",
    closed: "default",
    unverified: "default",
    inactive: "default",
  };
  
  return variantMap[normalized] ?? "default";
};
```

**Migration Path:**
```tsx
// OLD (bypasses Badge component)
<Badge className={getStatusColor(status)}>{status}</Badge>

// NEW (uses Badge variant system)
<Badge variant={getStatusVariant(status)}>{status}</Badge>
```

---

### 3. CARD COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/card.tsx`

**Base Styles:**
- Card: `rounded-lg border border-slate-200 bg-white shadow-sm`
- CardHeader: `border-b border-slate-100 px-6 py-4`
- CardContent: `px-6 py-4`
- CardFooter: `border-t border-slate-100 px-6 py-4`

**Critical Issue:** Pages override padding with `p-3`, `p-4`, `p-5`, `p-6` everywhere.

#### Required Standardization

**Decision: Standardize on `p-5` (20px)**

**Rationale:**
- Current CardHeader/CardContent/CardFooter use `px-6 py-4` (24px horizontal, 16px vertical)
- `p-5` (20px) is balanced middle ground
- Most pages already use `p-5` or `p-6`
- 20px is comfortable for cards (not cramped like p-3, not excessive like p-6)

**Updated Base Styles:**
```typescript
Card: "rounded-lg border border-slate-200 bg-white shadow-card"
CardHeader: "flex flex-col gap-1.5 border-b border-slate-100 p-5"
CardContent: "p-5"
CardFooter: "flex items-center border-t border-slate-100 p-5"
```

**New Variants:**
```typescript
interface CardProps {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg"; // Override padding when needed
}
```

**Variant Styles:**
```typescript
variant: {
  default: "border border-slate-200 bg-white shadow-card",
  elevated: "border-0 bg-white shadow-card-hover",
  outlined: "border-2 border-slate-200 bg-white shadow-none",
  ghost: "border-0 bg-slate-50 shadow-none"
}
```

**Padding Override (use sparingly):**
```typescript
padding: {
  none: "p-0",     // For custom content (tables, images)
  sm: "p-3",       // Compact cards (mobile)
  md: "p-5",       // Standard (default)
  lg: "p-6"        // Spacious cards (dashboard)
}
```

**Hoverable Cards:**
- When `hoverable={true}`, add hover state
- `hover:shadow-card-hover transition-shadow duration-200`
- Common for clickable cards (job listings, applications)

**Migration Strategy:**
```tsx
// OLD - Inconsistent overrides
<CardContent className="p-6 space-y-4">...</CardContent>
<CardContent className="p-4">...</CardContent>
<CardContent className="p-5 space-y-3">...</CardContent>

// NEW - Standard padding, explicit overrides only when needed
<CardContent>...</CardContent>  // Uses p-5 by default
<CardContent className="space-y-4">...</CardContent>  // Keeps p-5, adds spacing
<Card padding="lg"><CardContent>...</CardContent></Card>  // Explicit p-6 for all
```

---

### 4. INPUT COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/input.tsx`

**Features:**
- ✅ Label support
- ✅ Helper text
- ✅ Error state
- ✅ Accessibility (aria-invalid, aria-describedby)

**Missing:**
- ❌ Icon support (common pattern for search, email, password)
- ❌ Size variants (only h-10)
- ❌ Success state (only error)

#### Required Enhancements

**New Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Existing
  label?: string;
  helperText?: string;
  error?: string;
  
  // NEW
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  size?: "sm" | "md" | "lg";
  success?: boolean;
  successMessage?: string;
  onIconClick?: () => void; // For interactive icons (show/hide password)
}
```

**Size Variants:**
```typescript
size: {
  sm: "h-8 text-xs px-2.5",
  md: "h-10 text-sm px-3",    // default
  lg: "h-12 text-base px-4"
}
```

**Icon Support:**
- `iconLeft`: Displayed at input start, not interactive
- `iconRight`: Can be interactive (onClick handler)
- Icon size: 14px (sm), 16px (md), 18px (lg)
- Icon color: text-slate-400
- Interactive icons: cursor-pointer, hover:text-slate-600

**Success State:**
```typescript
// When success={true}
border: "border-emerald-500"
icon: Green checkmark on right (if no iconRight specified)
message: Display successMessage below input
```

**State Priority:**
1. Error (highest) - red border, error message
2. Success - green border, success message
3. Default - gray border

**Common Patterns:**
```tsx
// Search input
<Input iconLeft={Search} placeholder="Search jobs..." />

// Password input with toggle
<Input 
  type={showPassword ? "text" : "password"}
  iconRight={showPassword ? EyeOff : Eye}
  onIconClick={() => setShowPassword(!showPassword)}
/>

// Email with validation
<Input 
  type="email"
  success={isValidEmail}
  successMessage="Email is valid"
  error={emailError}
/>
```

---

### 5. MODAL COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/modal.tsx`

**Current Styles:**
- Max width: `max-w-lg` (hardcoded)
- Padding: `p-6`
- Title: Optional, `text-lg font-semibold`
- Close: Clicking backdrop only

**Issues:**
- ❌ No size variants (cramped for large content)
- ❌ No built-in close button
- ❌ No footer component
- ❌ No scroll handling for long content

#### Required Enhancements

**New Props:**
```typescript
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  
  // NEW
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean; // default: true
  closeOnEscape?: boolean; // default: true
}
```

**Size Variants:**
```typescript
size: {
  sm: "max-w-sm",   // 384px - Small confirmations
  md: "max-w-lg",   // 512px - Default, current behavior
  lg: "max-w-2xl",  // 672px - Forms, details
  xl: "max-w-4xl",  // 896px - Complex forms, tables
  full: "max-w-[calc(100vw-64px)] max-h-[calc(100vh-64px)]" // Almost fullscreen
}
```

**New Sub-Components:**
```tsx
<Modal open={open} onOpenChange={setOpen} size="lg" showCloseButton>
  <ModalHeader>
    <ModalTitle>Edit Job</ModalTitle>
    <ModalDescription>Update job details below</ModalDescription>
  </ModalHeader>
  
  <ModalContent>
    {/* Scrollable content area */}
  </ModalContent>
  
  <ModalFooter>
    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
    <Button onClick={handleSave}>Save Changes</Button>
  </ModalFooter>
</Modal>
```

**Component Styles:**
```typescript
ModalHeader: "border-b border-slate-200 p-6"
ModalTitle: "text-lg font-semibold text-slate-900"
ModalDescription: "mt-1 text-sm text-slate-600"
ModalContent: "p-6 overflow-y-auto max-h-[calc(100vh-300px)]"
ModalFooter: "border-t border-slate-200 p-6 flex justify-end gap-3"
```

**Close Button:**
- When `showCloseButton={true}`, render X button in top-right
- Position: `absolute top-4 right-4`
- Style: `rounded-md p-1 hover:bg-slate-100`
- Icon: X from Lucide (16px)
- Keyboard: Focusable, activates on Enter/Space

**Scroll Behavior:**
- ModalContent has max-height and overflow-y-auto
- Scrollbar styled (thin, themed)
- Sticky header/footer when scrolling

---

### 6. TABLE COMPONENT

#### Current Implementation
**File:** `packages/ui/src/components/table.tsx`

**Current Features:**
- ✅ Semantic sub-components (TableHeader, TableBody, TableRow, TableCell)
- ✅ Horizontal scroll wrapper
- ✅ Hover states on rows

**Missing:**
- ❌ No striped variant
- ❌ No compact/comfortable size variants
- ❌ No sorting indicators
- ❌ No loading state integration
- ❌ No empty state integration

#### Required Enhancements

**New Table Props:**
```typescript
interface TableProps {
  variant?: "default" | "striped";
  density?: "compact" | "comfortable" | "spacious";
  hoverable?: boolean; // default: true
}
```

**Variant Styles:**
```typescript
variant: {
  default: "Standard table",
  striped: "[&_tbody_tr:nth-child(even)]:bg-slate-50"
}
```

**Density Styles:**
```typescript
density: {
  compact: "TableCell p-2 text-xs",     // Dense data tables
  comfortable: "TableCell p-3 text-sm",  // Default
  spacious: "TableCell p-4 text-base"   // Relaxed, dashboard tables
}
```

**New TableHead Component:**
```tsx
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

<TableHead sortable sortDirection="asc" onSort={handleSort}>
  Job Title
</TableHead>
```

**Sort Indicators:**
- When `sortable={true}`, show sort icon on hover
- When `sortDirection="asc"`, show up arrow
- When `sortDirection="desc"`, show down arrow
- Icons: ChevronUp, ChevronDown from Lucide (14px)
- Cursor: pointer on sortable columns

**Empty State Integration:**
```tsx
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {data.length === 0 ? (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-64">
          <EmptyState 
            icon={Inbox}
            title="No data found"
            description="Try adjusting your filters"
          />
        </TableCell>
      </TableRow>
    ) : (
      data.map(row => <TableRow key={row.id}>...</TableRow>)
    )}
  </TableBody>
</Table>
```

**Loading State Integration:**
```tsx
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {loading ? (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <LoadingSkeleton variant="table" count={5} />
        </TableCell>
      </TableRow>
    ) : (
      data.map(row => <TableRow key={row.id}>...</TableRow>)
    )}
  </TableBody>
</Table>
```

---

### 7. SELECT COMPONENT (NEW)

**Required:** Currently missing, developers build custom dropdowns.

**New Component:** `packages/ui/src/components/select.tsx`

**Props:**
```typescript
interface SelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  
  // Optional features
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  size?: "sm" | "md" | "lg";
}
```

**Behavior:**
- Uses Radix UI Select primitive (accessible by default)
- Keyboard navigation (arrow keys, type to search)
- Click outside to close
- Escape to close
- When `searchable={true}`, show search input at top
- When `clearable={true}`, show X button when value selected
- Matches Input component styling for consistency

**Usage:**
```tsx
<Select
  label="Select Status"
  options={[
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" }
  ]}
  value={status}
  onChange={setStatus}
  searchable
  clearable
/>
```

---

### 8. MULTI-SELECT COMPONENT (NEW)

**Required:** Skill selection, tag inputs use custom implementations.

**New Component:** `packages/ui/src/components/multi-select.tsx`

**Props:**
```typescript
interface MultiSelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
  
  // Optional features
  searchable?: boolean;
  creatable?: boolean; // Allow creating new options
  max?: number; // Maximum selections
  disabled?: boolean;
  error?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}
```

**Display:**
- Selected values shown as removable badges
- Click badge X to remove
- Dropdown shows remaining options (hide selected)
- When `max` reached, disable remaining options

**Usage:**
```tsx
<MultiSelect
  label="Skills"
  options={skillOptions}
  value={selectedSkills}
  onChange={setSelectedSkills}
  searchable
  creatable
  max={10}
/>
```

---

## LAYOUT SYSTEM SPECIFICATIONS

### 1. CONTAINER

**Purpose:** Responsive max-width wrapper with consistent padding.

```typescript
interface ContainerProps {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: boolean; // default: true
  centered?: boolean; // default: true
}
```

**Size Mapping:**
```typescript
size: {
  sm: "max-w-3xl",   // 768px - Blog posts, forms
  md: "max-w-5xl",   // 1024px - Default
  lg: "max-w-7xl",   // 1280px - Dashboards
  xl: "max-w-[1920px]", // Wide dashboards
  full: "max-w-full" // Edge-to-edge
}
```

**Padding:**
- Desktop: `px-8` (32px)
- Tablet: `px-6` (24px)
- Mobile: `px-4` (16px)

---

### 2. GRID

**Purpose:** Responsive grid with configurable columns and gap.

```typescript
interface GridProps {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: "sm" | "md" | "lg";
  responsive?: boolean; // default: true
}
```

**Responsive Breakpoints (when responsive={true}):**
```typescript
cols={3} generates:
"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"

cols={4} generates:
"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
```

**Gap Sizes:**
```typescript
gap: {
  sm: "gap-3",  // 12px
  md: "gap-4",  // 16px (default)
  lg: "gap-6"   // 24px
}
```

---

### 3. STACK

**Purpose:** Vertical or horizontal spacing between children.

```typescript
interface StackProps {
  direction?: "vertical" | "horizontal";
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}
```

**Implementation:**
```typescript
direction: {
  vertical: "flex flex-col",
  horizontal: "flex flex-row"
}

spacing: {
  xs: "gap-1",   // 4px
  sm: "gap-2",   // 8px
  md: "gap-4",   // 16px
  lg: "gap-6",   // 24px
  xl: "gap-8"    // 32px
}
```

---

## STATE PATTERN SPECIFICATIONS

### 1. LOADING SKELETON ENHANCEMENTS

**Current File:** `apps/web/src/components/common/LoadingSkeleton.tsx`

**Issues:**
- Skeleton card padding (p-4) doesn't match real cards (p-5)
- Uses `shadow-card` but base Card uses `shadow-sm`
- Uses `rounded-xl` but base Card uses `rounded-lg`

**Fix: Match Real Component Styles**
```tsx
// Update LoadingSkeleton variants to match Card component exactly
<div className="rounded-lg border border-slate-100 bg-white p-5 shadow-card">
  {/* Skeleton content */}
</div>
```

**New Variants Needed:**
- `dashboard-stats`: 4 stat cards in grid
- `job-list`: List of job cards with logo, title, company, salary
- `application-table`: Table skeleton with sortable headers
- `form`: Multi-step form skeleton

---

### 2. EMPTY STATE ENHANCEMENTS

**Current File:** `apps/web/src/components/common/EmptyState.tsx`

**Issues:**
- Uses `rounded-xl` but Card uses `rounded-lg`
- Uses `shadow-card` but Card uses `shadow-sm`
- No variant support (info, warning, error)

**New Props:**
```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  severity?: "default" | "info" | "warning" | "error";
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}
```

**Severity Styles:**
```typescript
severity: {
  default: "bg-slate-100 text-slate-600",
  info: "bg-sky-100 text-sky-600",
  warning: "bg-amber-100 text-amber-600",
  error: "bg-rose-100 text-rose-600"
}
```

---

### 3. TOAST NOTIFICATION (NEW)

**Required:** Currently showing alerts, need proper toast system.

**New Component:** `packages/ui/src/components/toast.tsx`

**Features:**
- Stack in bottom-right corner
- Auto-dismiss after 5 seconds (configurable)
- Swipe to dismiss (mobile)
- Pause on hover
- Queue multiple toasts
- 4 variants (success, error, warning, info)

**API:**
```typescript
import { toast } from "@/components/ui/toast";

// Success
toast.success("Job created successfully");

// Error
toast.error("Failed to save changes");

// Warning
toast.warning("This action cannot be undone");

// Info
toast.info("New application received");

// Custom duration
toast.success("Saved", { duration: 3000 });

// With action
toast.error("Connection lost", {
  action: { label: "Retry", onClick: retryConnection }
});
```

---

## VALIDATION RULES

### Form Validation Patterns

**Email Validation:**
```typescript
const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};
```

**Password Validation:**
```typescript
const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
};
```

**Phone Validation:**
```typescript
const validatePhone = (phone: string): string | null => {
  if (!phone) return "Phone number is required";
  const cleaned = phone.replace(/\s+/g, "");
  if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned)) {
    return "Please enter a valid Indian mobile number";
  }
  return null;
};
```

---

## ERROR HANDLING

### Component Error Boundaries

**Global Error Boundary:**
```tsx
<ErrorBoundary fallback={<ErrorState />}>
  <App />
</ErrorBoundary>
```

**Page-Level Error Boundary:**
```tsx
<ErrorBoundary fallback={<PageErrorState />}>
  <DashboardPage />
</ErrorBoundary>
```

**Component-Level Error Boundary:**
```tsx
<ErrorBoundary fallback={<ComponentErrorState />}>
  <ComplexChart data={data} />
</ErrorBoundary>
```

---

## ACCESSIBILITY REQUIREMENTS

### Minimum Requirements (WCAG AA)

**Color Contrast:**
- Normal text (< 24px): 4.5:1
- Large text (≥ 24px): 3:1
- UI components: 3:1
- Focus indicators: 3:1

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Logical tab order
- Skip links for main content
- Focus visible on all elements
- No keyboard traps

**Screen Readers:**
- Semantic HTML (button, nav, main, article)
- ARIA labels on icon-only buttons
- ARIA live regions for dynamic content
- ARIA invalid for error states
- Role and aria-modal on dialogs

**Focus Management:**
- Focus trapped in open modals
- Focus returns to trigger after modal close
- Focus moves to first input in forms
- Focus visible with 2px ring

---

**END OF FRD**

**Next Document**: `03_DESIGN_TOKENS.md`
