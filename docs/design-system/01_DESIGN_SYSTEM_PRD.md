# CAMPUSHIRE DESIGN SYSTEM V2 - PRODUCT REQUIREMENTS DOCUMENT

**Version:** 2.0.0  
**Status:** Draft  
**Last Updated:** 2026-07-06  
**Owner:** Platform Team  
**Approvers:** CTO, Head of Product, Lead Designer

---

## EXECUTIVE SUMMARY

### Vision
Build a **world-class, scalable, accessible design system** that enables CampusHire to deliver consistent, high-quality user experiences across 7 distinct portals, supports future white-label customization, and reduces development time by 40%.

### Business Goals
1. **Consistency**: Single source of truth for all UI patterns
2. **Velocity**: Reduce feature development time from weeks to days
3. **Quality**: Ensure WCAG AA accessibility compliance by default
4. **Scalability**: Support 7 portals + future white-label expansion
5. **Maintainability**: Enable non-breaking upgrades and versioning

### Success Metrics
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Component consistency score | 40% | 95% | Q3 2026 |
| Design debt items | 15 critical | 0 critical | Q4 2026 |
| Developer onboarding time | Unknown | < 2 hours | Q3 2026 |
| Feature development time | 3-5 days | 1-2 days | Q4 2026 |
| Accessibility compliance | 70% | 100% WCAG AA | Q4 2026 |
| Design system documentation | 0 pages | 100+ pages | Q3 2026 |

---

## PROBLEM STATEMENT

### Current State Analysis
**Evidence:** P2 Design System Audit (`.kiro/p2-design-system-audit.md`)

#### Critical Issues
1. **Card Padding Chaos** (DD-001)
   - Same Card component, 4 different padding values (p-3, p-4, p-5, p-6)
   - Developers override base styles on 30+ pages
   - No consistency, no guidance

2. **Badge System Broken** (DD-002)
   - Badge variants don't match `getStatusColor()` utility
   - Forces developers to bypass component system
   - Custom className overrides everywhere

3. **Zero Documentation** (DD-003)
   - No design system docs
   - Developers guess styling patterns
   - Inconsistent implementations across teams

4. **Token Duplication** (DD-004)
   - `brand.navy` duplicates `primary.600`
   - `brand.sky` duplicates `accent.500`
   - Confusion, potential drift

5. **No Semantic Spacing** (DD-005)
   - Arbitrary values everywhere
   - No `space-card`, `space-section` tokens
   - Inconsistent padding/margin usage

#### Impact Assessment
- **Developer Productivity**: 30-40% time wasted on styling decisions
- **UX Consistency**: Users see 4 different card layouts in single flow
- **Accessibility**: No systematic accessibility testing
- **Scalability**: Cannot support white-label without major refactor
- **Onboarding**: New developers spend weeks learning undocumented patterns

---

## STAKEHOLDERS

### Primary Stakeholders
| Role | Name | Responsibility | Success Criteria |
|------|------|---------------|------------------|
| CTO | - | Final approval, technical direction | Zero production regressions |
| Head of Product | - | Feature alignment, UX consistency | 95% designer satisfaction |
| Lead Designer | - | Visual design, accessibility | WCAG AA compliance |
| Engineering Manager | - | Implementation, rollout | On-time, on-budget delivery |

### Secondary Stakeholders
- **Frontend Engineers** (10+): Daily users of design system
- **Product Designers** (3+): Create designs using system
- **QA Engineers** (5+): Test components and patterns
- **Customer Success**: Train customers on white-label customization

---

## SCOPE

### IN SCOPE

#### Phase 1: Foundation (Q3 2026)
- ✅ Design token consolidation and documentation
- ✅ Core component upgrades (Button, Badge, Card, Input, Modal, Table)
- ✅ Layout system (Grid, Stack, Container)
- ✅ Form system (Registration, Login, Job Creation patterns)
- ✅ State patterns (Loading, Empty, Error)
- ✅ Typography system (Headings, body, labels scale)
- ✅ Accessibility guidelines and testing framework
- ✅ Responsive system (Mobile-first, 5 breakpoints)
- ✅ Migration plan and tooling

#### Phase 2: Advanced Patterns (Q4 2026)
- ✅ Dashboard system (KPI cards, charts, grids)
- ✅ Table system (Sorting, filtering, pagination)
- ✅ Motion system (Transitions, animations)
- ✅ Form validation patterns
- ✅ Advanced accessibility (Screen reader testing)
- ✅ White-label theming architecture
- ✅ Storybook documentation site
- ✅ Component migration status tracking

#### Phase 3: Scale & Optimize (Q1 2027)
- ✅ Performance optimization
- ✅ Bundle size optimization
- ✅ Advanced white-label features
- ✅ Design token API for external systems
- ✅ Figma plugin for design-to-code
- ✅ Automated visual regression testing

### OUT OF SCOPE
- ❌ Backend API changes
- ❌ Database schema changes
- ❌ Third-party integrations (unless design system related)
- ❌ Business logic changes
- ❌ Content management system
- ❌ Marketing website redesign

### DEPENDENCIES
- **Tailwind CSS v3.4+**: Core styling framework
- **CVA (class-variance-authority)**: Component variant system
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon system
- **Storybook v7+**: Documentation and testing
- **TypeScript 5+**: Type safety

---

## DESIGN PRINCIPLES

### 1. Consistency Over Flexibility
**Rationale**: 7 portals need cohesive experience, not 7 different experiences.

**Examples:**
- ✅ Single card padding value (p-5) used everywhere
- ✅ Status badges always use system variants, never custom colors
- ❌ No "make your own button style" escape hatches

### 2. Accessibility First
**Rationale**: WCAG AA compliance is table stakes for enterprise SaaS.

**Requirements:**
- ✅ Minimum 4.5:1 contrast for normal text
- ✅ Minimum 3:1 contrast for large text and UI components
- ✅ Keyboard navigation for all interactive elements
- ✅ Screen reader friendly markup
- ✅ Focus indicators on all focusable elements

### 3. Mobile First
**Rationale**: 40% of users access on mobile devices.

**Approach:**
- ✅ Design mobile layout first, enhance for desktop
- ✅ Touch targets minimum 44x44px
- ✅ Responsive typography scale
- ✅ Mobile-optimized navigation patterns

### 4. Progressive Enhancement
**Rationale**: System must work without JavaScript, enhance with it.

**Examples:**
- ✅ Forms submit without JS
- ✅ Navigation works without JS
- ✅ Animations enhance but don't block
- ✅ Critical content visible without JS

### 5. Zero Breaking Changes
**Rationale**: Cannot disrupt 7 production portals during migration.

**Strategy:**
- ✅ Upgrade existing components, don't create duplicates
- ✅ Version components semantically (major.minor.patch)
- ✅ Deprecation warnings before removal
- ✅ Migration guides for every breaking change
- ✅ Automated codemod tools where possible

### 6. Documentation = Code
**Rationale**: Undocumented system = unused system.

**Requirements:**
- ✅ Every component has Storybook story
- ✅ Every variant documented with examples
- ✅ Every prop explained with TypeScript types
- ✅ Do's and don'ts for every pattern
- ✅ Accessibility notes on every component

### 7. Performance Budget
**Rationale**: Fast = better UX = better business outcomes.

**Targets:**
- ✅ Total bundle size < 100KB (gzipped)
- ✅ Largest Contentful Paint < 2.5s
- ✅ First Input Delay < 100ms
- ✅ Cumulative Layout Shift < 0.1

---

## USER PERSONAS

### Persona 1: Frontend Engineer (Primary User)
**Name**: Sarah (Frontend Engineer, 3 years experience)

**Goals:**
- Build features fast without reinventing UI patterns
- Write accessible, maintainable code
- Confidently modify components without breaking others
- Onboard quickly to unfamiliar portal codebases

**Pain Points (Current):**
- Wastes 2-3 hours per feature on styling decisions
- Can't find documentation, asks senior engineers
- Breaks designs accidentally due to no clear rules
- Copy-pastes components, creates inconsistencies

**Success Criteria:**
- Finds component in < 30 seconds via Storybook
- Understands API without reading source code
- Implements feature in 1 day instead of 3 days
- Zero accessibility violations in code review

### Persona 2: Product Designer (Secondary User)
**Name**: Alex (Product Designer, 5 years experience)

**Goals:**
- Design consistent experiences across portals
- Prototype quickly with real components
- Ensure designs are implementable
- Maintain brand consistency at scale

**Pain Points (Current):**
- Engineers implement designs differently than Figma
- No single source of truth for spacing/colors
- Can't preview components without engineering help
- Designs drift from implementation over time

**Success Criteria:**
- Figma components match production exactly
- Design-to-code handoff in < 1 hour
- Zero "is this buildable?" questions
- 95% design QA pass rate (up from 60%)

### Persona 3: QA Engineer (Secondary User)
**Name**: Jordan (QA Engineer, 4 years experience)

**Goals:**
- Test components systematically
- Catch accessibility issues early
- Verify responsive behavior efficiently
- Reduce regression bugs

**Pain Points (Current):**
- No component test coverage
- Accessibility testing manual and slow
- Regressions slip through due to no visual tests
- Can't test all breakpoints efficiently

**Success Criteria:**
- Automated visual regression tests
- Accessibility tests in CI/CD pipeline
- Component test coverage > 90%
- Zero accessibility bugs in production

---

## REQUIREMENTS

### Functional Requirements

#### FR-1: Design Tokens
**Priority**: P0 (Blocker)

- **FR-1.1**: Consolidate color system (remove duplicates, add missing shades)
- **FR-1.2**: Define semantic spacing scale (`space-xs` through `space-3xl`)
- **FR-1.3**: Define typography scale (font sizes, weights, line heights)
- **FR-1.4**: Define shadow system (4 elevation levels)
- **FR-1.5**: Define border radius system (3 sizes: sm, md, lg)
- **FR-1.6**: All tokens documented with usage guidelines

#### FR-2: Core Components
**Priority**: P0 (Blocker)

- **FR-2.1**: Button (5 variants, 3 sizes, loading state, icon support)
- **FR-2.2**: Badge (6 variants, 2 sizes, removable option)
- **FR-2.3**: Card (3 variants, standardized padding, hover states)
- **FR-2.4**: Input (icon support, 3 sizes, error/success states)
- **FR-2.5**: Modal (4 sizes, header/footer/close, scroll handling)
- **FR-2.6**: Table (3 variants, sortable, filterable, paginated)

#### FR-3: Layout System
**Priority**: P0 (Blocker)

- **FR-3.1**: Container (responsive max-width, configurable padding)
- **FR-3.2**: Grid (responsive columns, configurable gap)
- **FR-3.3**: Stack (vertical/horizontal, configurable spacing)
- **FR-3.4**: Flex (common flex patterns as components)

#### FR-4: Form System
**Priority**: P1 (High)

- **FR-4.1**: Form field wrapper (label, input, error, helper)
- **FR-4.2**: Select with search
- **FR-4.3**: Multi-select with tags
- **FR-4.4**: Date picker
- **FR-4.5**: File upload with preview
- **FR-4.6**: Rich text editor integration

#### FR-5: State Patterns
**Priority**: P1 (High)

- **FR-5.1**: Loading skeletons (8 variants matching real content)
- **FR-5.2**: Empty states (4 severity levels)
- **FR-5.3**: Error states (4 severity levels)
- **FR-5.4**: Toast notifications (4 types, auto-dismiss)

#### FR-6: Dashboard Components
**Priority**: P1 (High)

- **FR-6.1**: KPI cards (4 variants)
- **FR-6.2**: Chart wrappers (consistent styling)
- **FR-6.3**: Stat displays (trend indicators)
- **FR-6.4**: Dashboard grid layouts

#### FR-7: Documentation
**Priority**: P0 (Blocker)

- **FR-7.1**: Storybook with all components
- **FR-7.2**: Component API docs (props, variants, examples)
- **FR-7.3**: Pattern library (page layouts, forms, dashboards)
- **FR-7.4**: Accessibility guidelines
- **FR-7.5**: Migration guides

### Non-Functional Requirements

#### NFR-1: Performance
- Bundle size < 100KB gzipped
- Tree-shakeable components
- Lazy-loadable icon library
- No runtime CSS-in-JS (static Tailwind only)

#### NFR-2: Accessibility
- WCAG AA compliance minimum
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Color contrast validation

#### NFR-3: Browser Support
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

#### NFR-4: Responsive Support
- Mobile: 375px - 639px
- Tablet: 640px - 1023px
- Desktop: 1024px - 1535px
- Large: 1536px - 1919px
- Ultra-wide: 1920px+

#### NFR-5: Developer Experience
- TypeScript types for all props
- IntelliSense support
- Clear error messages
- Hot module reload support
- Fast build times (< 30s)

#### NFR-6: Testing
- Unit tests (> 80% coverage)
- Visual regression tests
- Accessibility tests (automated)
- Cross-browser tests
- Responsive tests

---

## RISKS & MITIGATION

### Risk 1: Migration Breaks Production
**Probability**: High  
**Impact**: Critical  
**Mitigation**:
- Feature flags for new components
- Gradual rollout (1 portal at a time)
- Automated regression tests before deploy
- Rollback plan for every release
- 2-week stabilization period between portals

### Risk 2: Team Adoption Resistance
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Involve engineers in design process
- Weekly design system office hours
- Celebrate early adopters
- Show velocity improvements with metrics
- Make compliance easy, not restrictive

### Risk 3: Documentation Becomes Stale
**Probability**: High  
**Impact**: Medium  
**Mitigation**:
- Auto-generate docs from TypeScript types
- Doc updates required for component PRs
- Monthly doc review sprints
- Community contribution guidelines
- Automated broken link checker

### Risk 4: Performance Regression
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Bundle size CI checks
- Performance budget enforcement
- Lighthouse CI integration
- Regular performance audits
- Tree-shaking verification

### Risk 5: White-Label Customization Breaks Design System
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Design token architecture supports theming
- Restrict customization to approved tokens only
- Automated theme validation
- White-label component showcase
- Customer success training program

---

## CONSTRAINTS

### Technical Constraints
- Must use existing Tailwind CSS setup (cannot switch frameworks)
- Must maintain backward compatibility during migration
- Cannot require Next.js version upgrade (currently 14.x)
- Must work with existing TypeScript 5.x
- Cannot break existing API integrations

### Business Constraints
- Zero revenue disruption during rollout
- Must launch Phase 1 by end of Q3 2026
- Budget: $200K (engineering time + tooling)
- Cannot hire additional engineers (use existing team)
- Must support white-label customers by Q4 2026

### Design Constraints
- Must maintain CampusHire brand identity
- Cannot do complete visual redesign (evolutionary, not revolutionary)
- Must support dark mode (future requirement)
- Must work with existing logo and brand colors
- Cannot require design tool migration (Figma only)

---

## SUCCESS METRICS

### Adoption Metrics
| Metric | Baseline | Q3 2026 | Q4 2026 | Q1 2027 |
|--------|----------|---------|---------|---------|
| Components using design system | 40% | 70% | 90% | 98% |
| Pages migrated to v2 | 0% | 30% | 70% | 100% |
| Custom className overrides | 100+ | 50 | 10 | 0 |
| Design system imports | 200 | 400 | 600 | 800 |

### Quality Metrics
| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| WCAG AA compliance | 70% | 100% | Q4 2026 |
| Component test coverage | 0% | 90% | Q4 2026 |
| Visual regression tests | 0 | 200+ | Q1 2027 |
| Accessibility bugs in prod | 15/quarter | 0/quarter | Q1 2027 |

### Velocity Metrics
| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Feature development time | 3-5 days | 1-2 days | Q4 2026 |
| Designer → Engineer handoff | 2-3 days | 2-4 hours | Q3 2026 |
| Developer onboarding | Unknown | < 2 hours | Q3 2026 |
| Design QA pass rate | 60% | 95% | Q4 2026 |

### Developer Satisfaction
| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| "Easy to find components" | - | 90% agree | Q3 2026 |
| "Documentation is clear" | - | 95% agree | Q4 2026 |
| "Speeds up my work" | - | 85% agree | Q4 2026 |
| "Would recommend to others" | - | 90% agree | Q1 2027 |

---

## TIMELINE

### Phase 1: Foundation (Q3 2026) - 12 weeks
- **Week 1-2**: Design token consolidation
- **Week 3-5**: Core component upgrades
- **Week 6-7**: Layout system implementation
- **Week 8-9**: Form system patterns
- **Week 10-11**: Documentation (Storybook)
- **Week 12**: QA, polish, launch

### Phase 2: Migration (Q4 2026) - 12 weeks
- **Week 1-2**: Portal 1 migration (Student)
- **Week 3-4**: Portal 2 migration (Recruiter)
- **Week 5-6**: Portal 3 migration (College Admin)
- **Week 7-8**: Portal 4-5 migration (Vendor, Training)
- **Week 9-10**: Portal 6-7 migration (Freelance, Super Admin)
- **Week 11-12**: Final QA, performance optimization

### Phase 3: Scale (Q1 2027) - 8 weeks
- **Week 1-2**: White-label architecture
- **Week 3-4**: Advanced patterns (charts, complex tables)
- **Week 5-6**: Performance optimization
- **Week 7-8**: Visual regression testing, final polish

---

## BUDGET

### Engineering Time
| Phase | Engineer-Weeks | Cost @ $5K/week | Total |
|-------|----------------|-----------------|-------|
| Phase 1: Foundation | 20 weeks | $5K | $100K |
| Phase 2: Migration | 24 weeks | $5K | $120K |
| Phase 3: Scale | 12 weeks | $5K | $60K |
| **TOTAL** | **56 weeks** | **$5K** | **$280K** |

### Tooling & Infrastructure
| Item | Cost | Justification |
|------|------|---------------|
| Storybook Cloud | $3,000/year | Hosted documentation |
| Chromatic (visual tests) | $5,000/year | Visual regression |
| Figma plugin development | $10,000 | Design-to-code bridge |
| Accessibility tools | $2,000/year | Automated WCAG testing |
| **TOTAL** | **$20,000** | **Year 1 costs** |

### Grand Total: $300K (Year 1)

**ROI Calculation:**
- Current: 10 engineers × 40% wasted time × $150K salary = $600K/year wasted
- After: 10 engineers × 10% wasted time × $150K salary = $150K/year wasted
- **Net Savings**: $450K/year
- **Payback Period**: 8 months

---

## APPROVAL CHECKLIST

### Technical Review
- [ ] CTO approval - Technical architecture
- [ ] Engineering Manager approval - Implementation plan
- [ ] DevOps approval - CI/CD integration
- [ ] Security approval - No new vulnerabilities

### Product Review
- [ ] Head of Product approval - Feature alignment
- [ ] Lead Designer approval - Visual design quality
- [ ] UX Researcher approval - Accessibility compliance
- [ ] Product Managers (7) approval - Portal-specific needs

### Business Review
- [ ] CFO approval - Budget allocation
- [ ] VP Customer Success approval - White-label strategy
- [ ] VP Sales approval - No customer disruption
- [ ] Legal approval - Licensing and compliance

---

**END OF PRD**

**Next Document**: `02_DESIGN_SYSTEM_FRD.md` (Functional Requirements Document)
