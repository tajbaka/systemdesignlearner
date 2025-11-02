# System Design Sandbox - Documentation Index

> Last Updated: November 2, 2025

## Quick Links

- [For AI Assistants (Claude Code)](#for-ai-assistants) - Start here if you're an AI helping with development
- [Implementation Guides](#implementation-guides) - Active development documentation
- [Setup & Configuration](#setup--configuration) - Environment and service setup
- [Product Strategy](#product-strategy) - Roadmap and planning
- [Archived Docs](#archived-docs) - Historical documentation

---

## For AI Assistants

### Primary Reference: CLAUDE.md

**Location:** `docs/CLAUDE.md`

This is the comprehensive guide for Claude Code and other AI assistants working on this project. It includes:

- Project overview and architecture
- Common development commands
- Code patterns and conventions
- File structure map
- Testing strategies
- Migration status (Board.tsx → ReactFlowBoard.tsx)
- Known workarounds and limitations

**Always read CLAUDE.md first** when starting work on this codebase.

---

## Implementation Guides

### Active Development Documentation

These guides contain current implementation details and are actively maintained:

#### Scoring System
- **`SCORING_IMPLEMENTATION_GUIDE.md`** - Core scoring algorithm implementation
- **`AI_SCORING_GUIDE.md`** - AI-powered scoring evaluation system
- **`scoring-system-plan.md`** - Scoring system architecture and plan

#### Optimization & Analytics
- **`AI_OPTIMIZATION_GUIDE.md`** - AI-driven design optimization suggestions
- **`CONVERSION_OPTIMIZATION_REPORT.md`** - Full site audit and conversion tweaks (Nov 2, 2025)

#### Features
- **`VERIFICATION_IMPLEMENTATION.md`** - Design verification and validation system
- **`SPEECH_TO_TEXT.md`** - Voice input implementation (if applicable)

---

## Setup & Configuration

### Supabase Integration
**Location:** `docs/SUPABASE_SETUP.md`

Instructions for setting up Supabase backend (optional):
- Database schema
- Authentication setup
- Environment variables
- API integration

### Environment Variables

Required environment variables (see `.env` for values):

```bash
# Error Monitoring
SENTRY_DSN=...

# Backend (Optional)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Analytics
VERCEL_ANALYTICS_ID=...
```

---

## Product Strategy

### Current Roadmap
**Location:** `docs/90DaysPlan.md`

90-day development roadmap with milestones and priorities.

### Conversion Optimization
**Location:** `docs/CONVERSION_OPTIMIZATION_REPORT.md`

Comprehensive site audit with actionable tweaks to improve conversions:
- Site scan summary
- Page-by-page analysis
- Prioritized improvements
- Implementation timeline

---

## Archived Docs

**Location:** `docs/archive/`

Historical planning documents that are no longer actively maintained but kept for reference:

- `ShippingPlan.md` - Original MVP launch plan (Sept 2024)
- `plan.md` - Initial product plan
- `update_practice_plan.md` - Practice mode planning

### Removed Documentation

The following docs were removed as the features are complete and documented in code:

- Mobile refactor summaries (mobile layout is now stable)
- Responsive layout implementation details (implementation complete)
- Debug instructions for specific bugs (bugs fixed)
- Mobile UX fix documentation (fixes applied)

---

## Project Structure Reference

```
system-design-sandbox/
├── app/
│   ├── components/
│   │   ├── SystemDesignEditor.tsx      # Main editor
│   │   ├── ReactFlowBoard.tsx          # React Flow canvas (current)
│   │   ├── Board.tsx                   # Legacy canvas (being phased out)
│   │   ├── layout/                     # Mobile/Desktop layouts
│   │   ├── mobile/                     # Mobile-specific components
│   │   └── desktop/                    # Desktop-specific components
│   ├── page.tsx                        # Landing page
│   ├── play/page.tsx                   # Editor page
│   └── practice/[slug]/page.tsx        # Practice challenges
├── lib/
│   ├── scenarios.ts                    # Scenario definitions
│   ├── evaluate.ts                     # Acceptance criteria
│   ├── scoring.ts                      # Score calculation
│   ├── shareLink.ts                    # URL encoding/decoding
│   └── undo.ts                         # Undo/redo system
├── docs/
│   ├── CLAUDE.md                       # ⭐ Main AI assistant guide
│   ├── DOCUMENTATION.md                # This file
│   ├── SCORING_IMPLEMENTATION_GUIDE.md
│   ├── AI_SCORING_GUIDE.md
│   ├── CONVERSION_OPTIMIZATION_REPORT.md
│   └── archive/                        # Old planning docs
└── __tests__/
    ├── simulate.test.ts                # Simulation tests
    └── practice.test.tsx               # Component tests
```

---

## Contributing to Documentation

### When to Update Docs

1. **New features** - Document in relevant implementation guide
2. **Architecture changes** - Update CLAUDE.md
3. **API changes** - Update type definitions and examples
4. **Bug fixes** - Remove debug docs once verified fixed
5. **Completed migrations** - Archive old implementation docs

### Documentation Standards

- Keep docs up-to-date with code
- Remove docs when features are stable and code is self-documenting
- Archive rather than delete historical planning docs
- Use clear headings and code examples
- Include "Last Updated" dates
- Link between related docs

### File Naming Conventions

- `UPPERCASE_NAME.md` - Major documentation files
- `lowercase-name.md` - Supporting/internal docs
- `FEATURE_GUIDE.md` - Implementation guides
- `FEATURE_PLAN.md` - Planning documents (archive when complete)

---

## Getting Help

1. **Development questions**: Read `docs/CLAUDE.md` first
2. **Setup issues**: Check `docs/SUPABASE_SETUP.md` or `.env` configuration
3. **Architecture questions**: See "File Structure Map" in `CLAUDE.md`
4. **Feature planning**: Review `docs/90DaysPlan.md`
5. **Conversion optimization**: See `docs/CONVERSION_OPTIMIZATION_REPORT.md`

---

## Maintenance Checklist

Regular documentation maintenance tasks:

- [ ] Review docs quarterly for outdated information
- [ ] Archive completed feature plans
- [ ] Update CLAUDE.md when architecture changes
- [ ] Remove debug/fix docs once issues are resolved
- [ ] Keep environment variable docs in sync with `.env.example`
- [ ] Update project structure diagrams when files move

---

*For the most comprehensive guide to this project, always start with `docs/CLAUDE.md`*