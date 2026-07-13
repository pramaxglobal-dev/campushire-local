# CAMPUSHIRE DESIGN SYSTEM V2 - LAYOUT SYSTEM

**Version:** 2.0.0  
**Status:** Draft  
**Last Updated:** 2026-07-06

---

## OVERVIEW

The layout system provides consistent page structures across all 7 portals while maintaining flexibility for portal-specific needs.

**Portals:**
1. Student Portal
2. Corporate Recruiter Portal
3. College Admin Portal
4. Vendor Portal
5. Training Partner Portal
6. Freelance Recruiter Portal
7. Super Admin Portal

---

## LAYOUT ANATOMY

### Standard Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│                    HEADER (60px)                     │
│  [Logo] [Breadcrumb] ............... [User] [Bell]  │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│          │                                           │
│ SIDEBAR  │           MAIN CONTENT                    │
│ (288px)  │           (dynamic)                       │
│          │                                           │
│          │                                           │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

**Responsive Behavior:**

**Desktop (≥1024px):**
- Sidebar: Visible, 288px fixed width
- Content: flex-1 (remaining space)

**Tablet (768px - 1023px):**
- Sidebar: Collapsible, 80px collapsed, 288px expanded
- Content: flex-1

**Mobile (<768px):**
- Sidebar: Hidden
- Header: Visible with hamburger menu
- Bottom Tab Navigation: Visible (60px)
- Content: Full width

---

## HEADER COMPONENT

### Design Specifications

**File:** `apps/web/src/components/layout/Header.tsx`

#### Desktop Header (≥768px)

```tsx
<header className="
  sticky top-0 z-20
  h-15                           // 60px height
  border-b border-slate-200
  bg-white/90 backdrop-blur      // Glassmorphism
  px-4 md:px-6                   // Responsive padding
">
  <div className="flex h-full items-center justify-between">
    {/* Left: Logo + Breadcrumb */}
    <div className="flex items-center gap-4">
      <Link href="/dashboard">
        <img src="/logo.png" alt="CampusHire" className="h-8" />
      </Link>
      <Breadcrumb />
    </div>
    
    {/* Right: Notifications + User Menu */}
    <div className="flex items-center gap-3">
      <NotificationBell />
      <UserMenu />
    </div>
  </div>
</header>
```

#### Mobile Header (<768px)

```tsx
<header className="
  sticky top-0 z-20
  h-15 border-b border-slate-200
  bg-white px-4
">
  <div className="flex h-full items-center justify-between">
    {/* Left: Hamburger + Logo */}
    <div className="flex items-center gap-3">
      <button onClick={toggleMobileMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
      <img src="/logo-sm.png" alt="CampusHire" className="h-7" />
    </div>
    
    {/* Center: Current Page Title */}
    <h1 className="text-sm font-medium">{pageTitle}</h1>
    
    {/* Right: Notifications */}
    <NotificationBell />
  </div>
</header>
```

### Header Sub-Components

#### 1. Breadcrumb

```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
  <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
    Dashboard
  </Link>
  <ChevronRight className="h-4 w-4 text-slate-400" />
  <Link href="/dashboard/jobs" className="text-slate-600 hover:text-slate-900">
    Jobs
  </Link>
  <ChevronRight className="h-4 w-4 text-slate-400" />
  <span className="font-medium text-slate-900">Software Engineer</span>
</nav>
```

#### 2. Notification Bell

```tsx
<button 
  className="relative rounded-md p-2 hover:bg-slate-100"
  aria-label="Notifications"
>
  <Bell className="h-5 w-5 text-slate-600" />
  {unreadCount > 0 && (
    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-medium text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</button>
```

#### 3. User Menu

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-100">
      <Avatar size="sm" src={user.avatarUrl} alt={user.name} />
      <ChevronDown className="h-4 w-4 text-slate-600" />
    </button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-56">
    <div className="space-y-1">
      <Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
        <User className="h-4 w-4" />
        Profile
      </Link>
      <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      <hr className="my-1 border-slate-200" />
      <button 
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  </PopoverContent>
</Popover>
```

---

## SIDEBAR COMPONENT

### Design Specifications

**File:** `apps/web/src/components/layout/Sidebar.tsx`

#### Desktop Sidebar (≥1024px)

```tsx
<aside className="
  sticky top-15 left-0          // Below header
  h-[calc(100vh-60px)]          // Full height minus header
  w-72                          // 288px width
  border-r border-slate-200
  bg-white
  overflow-y-auto
">
  {/* User Profile Section */}
  <div className="border-b border-slate-200 p-5">
    <div className="flex items-center gap-3">
      <Avatar size="md" src={user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {user.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          {user.email}
        </p>
      </div>
    </div>
  </div>
  
  {/* Navigation */}
  <nav className="p-3">
    <ul className="space-y-1">
      {navItems.map(item => (
        <li key={item.href}>
          <NavLink href={item.href} icon={item.icon}>
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
</aside>
```

#### Tablet Collapsible Sidebar (768px - 1023px)

```tsx
<aside className={cn(
  "sticky top-15 left-0",
  "h-[calc(100vh-60px)]",
  "border-r border-slate-200 bg-white",
  "transition-all duration-300",
  isCollapsed ? "w-20" : "w-72"
)}>
  {/* Collapse Toggle Button */}
  <button 
    onClick={toggleCollapse}
    className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
  >
    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
  </button>
  
  {/* Content */}
  {isCollapsed ? (
    // Collapsed: Show only icons
    <nav className="p-2">
      {navItems.map(item => (
        <Tooltip key={item.href} content={item.label} side="right">
          <NavLink href={item.href} iconOnly icon={item.icon} />
        </Tooltip>
      ))}
    </nav>
  ) : (
    // Expanded: Show full content
    <>{/* Same as desktop */}</>
  )}
</aside>
```

### Nav Link Component

```tsx
interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  iconOnly?: boolean;
  badge?: number;
}

const NavLink = ({ href, icon: Icon, children, iconOnly, badge }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary-600 text-white shadow-nav"
          : "text-slate-700 hover:bg-slate-100"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!iconOnly && (
        <>
          <span className="flex-1">{children}</span>
          {badge && badge > 0 && (
            <Badge size="sm" variant={isActive ? "default" : "info"}>
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
};
```

---

## MOBILE BOTTOM NAVIGATION

### Design Specifications

**File:** `apps/web/src/components/layout/MobileNav.tsx`

```tsx
<nav className="
  fixed bottom-0 left-0 right-0 z-20
  border-t border-slate-200
  bg-white
  h-15                          // 60px height
  md:hidden                     // Hide on tablet+
">
  <ul className="flex h-full items-center justify-around px-2">
    {primaryNavItems.map(item => (
      <li key={item.href}>
        <MobileNavLink href={item.href} icon={item.icon}>
          {item.label}
        </MobileNavLink>
      </li>
    ))}
  </ul>
</nav>
```

### Mobile Nav Link

```tsx
const MobileNavLink = ({ href, icon: Icon, children }: MobileNavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2",
        isActive ? "text-accent-600" : "text-slate-600"
      )}
    >
      <Icon className={cn(
        "h-5 w-5",
        isActive && "scale-110 transition-transform"
      )} />
      <span className="text-xs font-medium">{children}</span>
    </Link>
  );
};
```

**Primary Nav Items (Mobile):**
- Dashboard
- Jobs (or relevant primary action)
- Applications
- Profile

---

## PAGE LAYOUTS

### 1. Dashboard Page Layout

**Use Case:** Dashboard, Analytics, Overview pages

```tsx
<Container size="xl" className="py-6">
  <PageHeader
    title="Student Dashboard"
    description="Welcome back! Here's your overview."
    action={
      <Button iconLeft={Plus}>New Application</Button>
    }
  />
  
  <div className="mt-6 space-y-6">
    {/* Stats Grid */}
    <Grid cols={4} gap="md">
      <StatCard 
        title="Applications"
        value={stats.applications}
        trend={+12}
        icon={Briefcase}
      />
      <StatCard 
        title="Interviews"
        value={stats.interviews}
        trend={+5}
        icon={Calendar}
      />
      {/* ... more stats */}
    </Grid>
    
    {/* Charts Row */}
    <Grid cols={2} gap="md">
      <Card>
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartComponent data={funnelData} />
        </CardContent>
      </Card>
      {/* ... more charts */}
    </Grid>
    
    {/* Recent Activity */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Applications</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent>
        <Table>
          {/* Table content */}
        </Table>
      </CardContent>
    </Card>
  </div>
</Container>
```

---

### 2. List Page Layout

**Use Case:** Jobs List, Applications List, Students List

```tsx
<Container size="xl" className="py-6">
  <PageHeader
    title="All Jobs"
    description="Browse and manage job postings"
    action={
      <Button iconLeft={Plus}>Post New Job</Button>
    }
  />
  
  {/* Filters */}
  <Card className="mt-6">
    <CardContent>
      <div className="flex flex-wrap gap-3">
        <Select
          placeholder="Status"
          options={statusOptions}
          value={filters.status}
          onChange={handleStatusChange}
          clearable
        />
        <Select
          placeholder="Department"
          options={departments}
          value={filters.department}
          onChange={handleDepartmentChange}
          clearable
        />
        <Input
          iconLeft={Search}
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
    </CardContent>
  </Card>
  
  {/* Results */}
  <div className="mt-6">
    {loading ? (
      <LoadingSkeleton variant="job-list" count={5} />
    ) : jobs.length === 0 ? (
      <EmptyState
        icon={Briefcase}
        title="No jobs found"
        description="Try adjusting your filters"
        action={{
          label: "Clear Filters",
          onClick: clearFilters
        }}
      />
    ) : (
      <Grid cols={1} gap="md">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </Grid>
    )}
  </div>
  
  {/* Pagination */}
  {totalPages > 1 && (
    <div className="mt-6 flex justify-center">
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )}
</Container>
```

---

### 3. Detail Page Layout

**Use Case:** Job Details, Application Details, Profile View

```tsx
<Container size="lg" className="py-6">
  {/* Breadcrumb is in header */}
  
  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    {/* Main Content */}
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <CardDescription className="mt-1">
                {job.company} • {job.location} • {job.type}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(job.status)}>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm">
            {job.description}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {job.requirements.map((req, i) => (
              <li key={i} className="flex gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
    
    {/* Sidebar */}
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow icon={DollarSign} label="Salary">
            {formatSalaryRange(job.minSalary, job.maxSalary)}
          </InfoRow>
          <InfoRow icon={Calendar} label="Posted">
            {formatDate(job.createdAt)}
          </InfoRow>
          <InfoRow icon={Users} label="Applicants">
            {job.applicantCount}
          </InfoRow>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Button className="w-full" size="lg">
            Apply Now
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</Container>
```

---

### 4. Form Page Layout

**Use Case:** Create Job, Edit Profile, Multi-Step Forms

```tsx
<Container size="md" className="py-6">
  <PageHeader
    title="Post New Job"
    description="Create a job posting for your company"
  />
  
  {/* Progress Indicator (for multi-step) */}
  {isMultiStep && (
    <div className="mt-6">
      <ProgressSteps
        steps={["Details", "Requirements", "Review"]}
        currentStep={currentStep}
      />
    </div>
  )}
  
  <Card className="mt-6">
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Job Title"
          placeholder="e.g. Software Engineer"
          error={errors.title}
          {...register("title")}
        />
        
        <Textarea
          label="Job Description"
          placeholder="Describe the role, responsibilities, and qualifications..."
          rows={8}
          error={errors.description}
          {...register("description")}
        />
        
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Job Type"
            options={jobTypeOptions}
            error={errors.type}
            {...register("type")}
          />
          
          <Select
            label="Experience Level"
            options={experienceOptions}
            error={errors.experience}
            {...register("experience")}
          />
        </div>
        
        <MultiSelect
          label="Required Skills"
          options={skillOptions}
          searchable
          creatable
          {...register("skills")}
        />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Post Job
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</Container>
```

---

### 5. Settings Page Layout

**Use Case:** Settings, Preferences, Configuration

```tsx
<Container size="lg" className="py-6">
  <PageHeader
    title="Settings"
    description="Manage your account settings and preferences"
  />
  
  <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
    {/* Settings Nav */}
    <nav className="space-y-1">
      <SettingsNavLink href="/settings/profile" icon={User}>
        Profile
      </SettingsNavLink>
      <SettingsNavLink href="/settings/account" icon={Settings}>
        Account
      </SettingsNavLink>
      <SettingsNavLink href="/settings/notifications" icon={Bell}>
        Notifications
      </SettingsNavLink>
      <SettingsNavLink href="/settings/security" icon={Lock}>
        Security
      </SettingsNavLink>
    </nav>
    
    {/* Settings Content */}
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Settings form */}
        </CardContent>
      </Card>
    </div>
  </div>
</Container>
```

---

## RESPONSIVE BREAKPOINTS

### Layout Behavior Matrix

| Screen Size | Sidebar | Header | Bottom Nav | Container Padding |
|-------------|---------|--------|------------|-------------------|
| < 768px | Hidden | Mobile | Visible | px-4 (16px) |
| 768px - 1023px | Collapsible | Desktop | Hidden | px-6 (24px) |
| ≥ 1024px | Visible | Desktop | Hidden | px-8 (32px) |

### Content Width Guidelines

| Container Size | Max Width | Use Case |
|----------------|-----------|----------|
| `sm` | 768px | Forms, blog posts |
| `md` | 1024px | Default pages |
| `lg` | 1280px | Dashboard pages |
| `xl` | 1920px | Wide dashboards, tables |
| `full` | 100% | Admin pages, data-heavy |

---

## PORTAL-SPECIFIC LAYOUTS

### 1. Student Portal

**Primary Navigation:**
- Dashboard
- Find Jobs
- My Applications
- Events & Courses
- Profile

**Dashboard Focus:** Career score, recommended jobs, upcoming interviews

---

### 2. Corporate Recruiter Portal

**Primary Navigation:**
- Dashboard
- Post Job
- Applications
- Candidates
- Analytics

**Dashboard Focus:** Active jobs, recent applications, hiring funnel

---

### 3. College Admin Portal

**Primary Navigation:**
- Dashboard
- Students
- Recruiters
- Jobs
- Reports

**Dashboard Focus:** Placement stats, upcoming drives, student status

---

### 4. Vendor Portal

**Primary Navigation:**
- Dashboard
- Services
- Clients
- Invoices
- Profile

**Dashboard Focus:** Active services, pending invoices, client requests

---

### 5. Training Partner Portal

**Primary Navigation:**
- Dashboard
- Courses
- Students
- Certificates
- Analytics

**Dashboard Focus:** Course enrollments, completion rates, revenue

---

### 6. Freelance Recruiter Portal

**Primary Navigation:**
- Dashboard
- Find Jobs
- My Placements
- Commissions
- Profile

**Dashboard Focus:** Open positions, placements, earnings

---

### 7. Super Admin Portal

**Primary Navigation:**
- Dashboard
- Users
- Colleges
- Companies
- System

**Dashboard Focus:** Platform metrics, user growth, system health

---

**END OF LAYOUT SYSTEM**

**Next Document**: `06_FORM_SYSTEM.md`
