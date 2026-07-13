# CAMPUSHIRE DESIGN SYSTEM V2 - COMPONENT ARCHITECTURE

**Version:** 2.0.0  
**Status:** Draft  
**Last Updated:** 2026-07-06  
**Package:** `@campushire/ui`

---

## ARCHITECTURE OVERVIEW

### Component Library Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── multi-select.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio.tsx
│   │   ├── switch.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   ├── tabs.tsx
│   │   ├── accordion.tsx
│   │   ├── avatar.tsx
│   │   ├── progress.tsx
│   │   └── lib.ts (cn utility)
│   ├── layouts/
│   │   ├── container.tsx
│   │   ├── grid.tsx
│   │   ├── stack.tsx
│   │   └── flex.tsx
│   ├── patterns/
│   │   ├── empty-state.tsx
│   │   ├── error-state.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── page-header.tsx
│   │   ├── stat-card.tsx
│   │   └── kpi-card.tsx
│   └── index.ts (barrel export)
├── package.json
└── tsconfig.json
```

---

## COMPONENT DESIGN PRINCIPLES

### 1. Composition Over Configuration

**Bad:**
```tsx
<Card 
  hasHeader 
  hasFooter 
  headerTitle="Job Details"
  footerButtons={[...]}
/>
```

**Good:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Job Details</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### 2. Controlled vs Uncontrolled

**Support Both:**
```tsx
// Controlled (parent manages state)
<Select value={status} onChange={setStatus} options={options} />

// Uncontrolled (component manages state)
<Select defaultValue="active" onChange={handleChange} options={options} />
```

### 3. TypeScript First

**All components must:**
- Export TypeScript interface for props
- Use generics where appropriate
- Have strict null checks
- Provide IntelliSense documentation

```tsx
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Whether the button is in a loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Text to display when loading
   * @default undefined (keeps original children)
   */
  loadingText?: string;
}
```

### 4. Accessible By Default

**Every component must:**
- Use semantic HTML
- Support keyboard navigation
- Have proper ARIA attributes
- Meet WCAG AA color contrast
- Have focus indicators

### 5. Performance Optimized

**Best practices:**
- Use React.forwardRef for DOM access
- Memoize expensive computations
- Lazy load heavy components
- Tree-shakeable exports
- No runtime CSS-in-JS

---

## CORE COMPONENTS API

### 1. BUTTON

**File:** `packages/ui/src/components/button.tsx`

#### Complete API

```typescript
import { Button } from "@campushire/ui";
import { Plus, ExternalLink } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  iconOnly?: boolean;
  asChild?: boolean; // Radix polymorphism
}
```

#### Usage Examples

```tsx
// Basic button
<Button>Save Changes</Button>

// Variants
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">View More</Button>
<Button variant="ghost">Dismiss</Button>
<Button variant="link">Learn More</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Loading state
<Button loading>Saving...</Button>
<Button loading loadingText="Processing...">Submit</Button>

// With icons
<Button iconLeft={Plus}>Add Job</Button>
<Button iconRight={ExternalLink}>Open</Button>
<Button iconOnly aria-label="Delete"><Trash /></Button>

// As link (Next.js)
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

#### Implementation Pattern

```tsx
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant, 
    size, 
    loading, 
    loadingText,
    iconLeft: IconLeft,
    iconRight: IconRight,
    iconOnly,
    children,
    disabled,
    className, 
    ...props 
  }, ref) => {
    const content = loading ? (
      <>
        <Spinner size="sm" />
        {loadingText || children}
      </>
    ) : iconOnly ? (
      children
    ) : (
      <>
        {IconLeft && <IconLeft className="h-4 w-4" />}
        {children}
        {IconRight && <IconRight className="h-4 w-4" />}
      </>
    );

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {content}
      </button>
    );
  }
);
```

---

### 2. BADGE

**File:** `packages/ui/src/components/badge.tsx`

#### Complete API

```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | 
            "violet" | "indigo" | "orange";
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
}
```

#### Usage Examples

```tsx
// Status badges
<Badge variant={getStatusVariant(status)}>{status}</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>

// Removable (for filters, tags)
<Badge removable onRemove={() => handleRemove("tag-id")}>
  React
</Badge>

// Custom styling (rare, prefer variants)
<Badge className="uppercase">Custom</Badge>
```

#### Integration with getStatusVariant()

**Updated Utility:** `packages/utils/src/index.ts`

```typescript
export type BadgeVariant = "default" | "success" | "warning" | "danger" | 
                           "info" | "violet" | "indigo" | "orange";

export const getStatusVariant = (status: string | null | undefined): BadgeVariant => {
  if (!status || typeof status !== "string") return "default";
  
  const normalized = status.toLowerCase();
  const variantMap: Record<string, BadgeVariant> = {
    // Success: green
    accepted: "success", hired: "success", active: "success",
    approved: "success", verified: "success", completed: "success",
    confirmed: "success", paid: "success", ongoing: "success",
    
    // Warning: amber
    screening: "warning", pending: "warning", pending_approval: "warning",
    on_hold: "warning", requested: "warning", rescheduled: "warning",
    
    // Danger: rose
    rejected: "danger", expired: "danger", cancelled: "danger",
    overdue: "danger", failed: "danger",
    
    // Info: sky
    applied: "info", shortlisted: "info", in_progress: "info",
    scheduled: "info", upcoming: "info", sent: "info",
    
    // Violet: offer states
    offered: "violet", triggered: "violet",
    
    // Indigo: interview states
    interview_r1: "indigo", interview_r2: "indigo", interview_r3: "indigo",
    
    // Orange: caution
    paused: "orange", disputed: "orange",
    
    // Default: neutral
    draft: "default", withdrawn: "default", disconnected: "default",
    closed: "default", unverified: "default", inactive: "default",
  };
  
  return variantMap[normalized] ?? "default";
};
```

---

### 3. CARD

**File:** `packages/ui/src/components/card.tsx`

#### Complete API

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

#### Usage Examples

```tsx
// Standard card (p-5 padding)
<Card>
  <CardHeader>
    <CardTitle>Job Title</CardTitle>
    <CardDescription>Full-time • Remote</CardDescription>
  </CardHeader>
  <CardContent>
    Job description goes here...
  </CardContent>
  <CardFooter>
    <Button>Apply Now</Button>
  </CardFooter>
</Card>

// Variants
<Card variant="elevated">Higher elevation shadow</Card>
<Card variant="outlined">Strong border, no shadow</Card>
<Card variant="ghost">Subtle background, no border</Card>

// Hoverable (for clickable cards)
<Card hoverable onClick={handleClick}>
  Interactive card
</Card>

// Custom padding
<Card padding="lg">Extra spacious</Card>
<Card padding="none">
  <CardContent className="p-0">
    <img src="..." className="w-full" />
  </CardContent>
</Card>

// Composition with other components
<Card>
  <CardContent>
    {loading ? (
      <LoadingSkeleton variant="card" />
    ) : data.length === 0 ? (
      <EmptyState icon={Inbox} title="No jobs" />
    ) : (
      <div>{/* Content */}</div>
    )}
  </CardContent>
</Card>
```

---

### 4. INPUT

**File:** `packages/ui/src/components/input.tsx`

#### Complete API

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  successMessage?: string;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  onIconClick?: () => void;
  size?: "sm" | "md" | "lg";
}
```

#### Usage Examples

```tsx
// Basic input
<Input 
  label="Email" 
  placeholder="you@example.com"
  helperText="We'll never share your email"
/>

// With error
<Input 
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// With success
<Input 
  label="Username"
  success={isAvailable}
  successMessage="Username is available!"
/>

// With icons
<Input 
  iconLeft={Search} 
  placeholder="Search jobs..."
/>

<Input 
  type={showPassword ? "text" : "password"}
  iconRight={showPassword ? EyeOff : Eye}
  onIconClick={() => setShowPassword(!showPassword)}
/>

// Sizes
<Input size="sm" placeholder="Small" />
<Input size="md" placeholder="Medium (default)" />
<Input size="lg" placeholder="Large" />
```

---

### 5. SELECT

**File:** `packages/ui/src/components/select.tsx` (NEW)

#### Complete API

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  
  label?: string;
  helperText?: string;
  error?: string;
  
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}
```

#### Usage Examples

```tsx
// Basic select
<Select
  label="Job Status"
  options={[
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" }
  ]}
  value={status}
  onChange={setStatus}
/>

// Searchable select (for long lists)
<Select
  label="Select College"
  options={colleges}
  searchable
  placeholder="Search colleges..."
/>

// Clearable select
<Select
  label="Filter by Department"
  options={departments}
  clearable
  placeholder="All departments"
/>

// With error
<Select
  label="Select Program"
  options={programs}
  error="Program is required"
/>
```

---

### 6. MULTI-SELECT

**File:** `packages/ui/src/components/multi-select.tsx` (NEW)

#### Complete API

```typescript
interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
  
  label?: string;
  helperText?: string;
  error?: string;
  
  searchable?: boolean;
  creatable?: boolean;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}
```

#### Usage Examples

```tsx
// Basic multi-select
<MultiSelect
  label="Skills"
  options={skillOptions}
  value={selectedSkills}
  onChange={setSelectedSkills}
/>

// With creation (for tagging)
<MultiSelect
  label="Tags"
  options={existingTags}
  value={tags}
  onChange={setTags}
  creatable
  placeholder="Add tags..."
/>

// With maximum selections
<MultiSelect
  label="Select up to 5 skills"
  options={skills}
  value={selected}
  onChange={setSelected}
  max={5}
  helperText={`${selected.length}/5 selected`}
/>

// Searchable
<MultiSelect
  label="Select Colleges"
  options={colleges}
  searchable
  placeholder="Search and select..."
/>
```

---

### 7. MODAL

**File:** `packages/ui/src/components/modal.tsx`

#### Complete API

```typescript
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface ModalDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

#### Usage Examples

```tsx
// Basic modal
<Modal 
  open={isOpen} 
  onOpenChange={setIsOpen}
  title="Delete Job"
>
  <p>Are you sure you want to delete this job?</p>
  <div className="flex gap-2 mt-4">
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="destructive" onClick={handleDelete}>
      Delete
    </Button>
  </div>
</Modal>

// With composition
<Modal 
  open={isOpen} 
  onOpenChange={setIsOpen}
  size="lg"
  showCloseButton
>
  <ModalHeader>
    <ModalTitle>Edit Job</ModalTitle>
    <ModalDescription>
      Update job details below
    </ModalDescription>
  </ModalHeader>
  
  <ModalContent>
    <form>
      {/* Long form content */}
    </form>
  </ModalContent>
  
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button onClick={handleSave}>Save Changes</Button>
  </ModalFooter>
</Modal>

// Different sizes
<Modal size="sm" {...props}>Small modal</Modal>
<Modal size="md" {...props}>Default modal</Modal>
<Modal size="lg" {...props}>Large modal</Modal>
<Modal size="xl" {...props}>Extra large modal</Modal>
<Modal size="full" {...props}>Almost fullscreen</Modal>
```

---

### 8. TABLE

**File:** `packages/ui/src/components/table.tsx`

#### Complete API

```typescript
interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: "default" | "striped";
  density?: "compact" | "comfortable" | "spacious";
  hoverable?: boolean;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}
```

#### Usage Examples

```tsx
// Basic table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(row => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(row.status)}>
            {row.status}
          </Badge>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="ghost">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

// Sortable table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead 
        sortable 
        sortDirection={sortConfig.key === "name" ? sortConfig.direction : null}
        onSort={() => handleSort("name")}
      >
        Name
      </TableHead>
      <TableHead 
        sortable 
        sortDirection={sortConfig.key === "date" ? sortConfig.direction : null}
        onSort={() => handleSort("date")}
      >
        Date
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>...</TableBody>
</Table>

// Variants
<Table variant="striped">Striped rows</Table>
<Table density="compact">Dense table</Table>
<Table density="spacious">Relaxed table</Table>

// With loading/empty states
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {loading ? (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <LoadingSkeleton variant="table" />
        </TableCell>
      </TableRow>
    ) : data.length === 0 ? (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-64">
          <EmptyState 
            icon={Inbox}
            title="No data found"
          />
        </TableCell>
      </TableRow>
    ) : (
      data.map(row => <TableRow key={row.id}>...</TableRow>)
    )}
  </TableBody>
</Table>
```

---

### 9. TOAST

**File:** `packages/ui/src/components/toast.tsx` (NEW)

#### Complete API

```typescript
// Imperative API (like sonner or react-hot-toast)
import { toast } from "@campushire/ui/toast";

toast.success(message: string, options?: ToastOptions);
toast.error(message: string, options?: ToastOptions);
toast.warning(message: string, options?: ToastOptions);
toast.info(message: string, options?: ToastOptions);

interface ToastOptions {
  duration?: number; // milliseconds, default: 5000
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}
```

#### Usage Examples

```tsx
// Success toast
toast.success("Job created successfully");

// Error toast
toast.error("Failed to save changes");

// With action
toast.error("Connection lost", {
  action: {
    label: "Retry",
    onClick: () => retryConnection()
  }
});

// Custom duration
toast.info("Email sent", { duration: 3000 });

// In root layout (required)
import { Toaster } from "@campushire/ui/toast";

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

---

## LAYOUT COMPONENTS API

### 1. CONTAINER

```typescript
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: boolean;
  centered?: boolean;
}
```

**Usage:**
```tsx
<Container size="lg">
  <h1>Dashboard</h1>
  {/* Content automatically centered and responsive */}
</Container>
```

---

### 2. GRID

```typescript
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: "sm" | "md" | "lg";
  responsive?: boolean;
}
```

**Usage:**
```tsx
<Grid cols={3} gap="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

---

### 3. STACK

```typescript
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "vertical" | "horizontal";
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}
```

**Usage:**
```tsx
<Stack direction="vertical" spacing="md">
  <Input label="First Name" />
  <Input label="Last Name" />
  <Button>Submit</Button>
</Stack>
```

---

## PATTERN COMPONENTS API

### 1. EMPTY STATE

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

### 2. ERROR STATE

```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  severity?: "error" | "warning";
  onRetry?: () => void;
}
```

### 3. LOADING SKELETON

```typescript
interface LoadingSkeletonProps {
  variant?: "card" | "list" | "table" | "profile" | "feed" | 
            "dashboard-stats" | "job-list" | "form";
  count?: number;
}
```

---

**END OF COMPONENT ARCHITECTURE**

**Next Document**: `05_LAYOUT_SYSTEM.md`
