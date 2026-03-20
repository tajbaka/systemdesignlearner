---
name: agent-team
description: Design and launch a coordinated multi-agent team. Use when starting a feature that needs parallel frontend/backend work with review checkpoints.
---

# Agent Team Orchestration

Guide for launching the project's coordinated agent team.

## Pre-Flight Check

**Use the team when:**

- Feature spans frontend AND backend
- Work is parallelizable (builders can work simultaneously)
- Multiple review checkpoints needed

**Use a single session instead when:**

- Backend-only or frontend-only change
- Quick fix or small change
- Sequential tasks that touch same files

## Team Structure

```
                    ┌─────────────────┐
                    │     PLANNER     │
                    │   (opus, lead)  │
                    └────────┬────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │ BACKEND-BUILDER │               │ FRONTEND-BUILDER│
   │    (sonnet)     │               │     (sonnet)    │
   └────────┬────────┘               └────────┬────────┘
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ FULLSTACK-REVIEW│
                    │    (sonnet)     │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │   QA-REVIEWER   │
                    │    (sonnet)     │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │     PLANNER     │
                    │ (final approval)│
                    └─────────────────┘
```

## File Ownership

| Agent            | Owns                              | Never Touches             |
| ---------------- | --------------------------------- | ------------------------- |
| backend-builder  | `server/domains/**`, `app/api/**` | `domains/**`              |
| frontend-builder | `domains/**`                      | `server/**`, `app/api/**` |

Shared types: Backend creates in `server/domains/*/types.ts`, frontend imports.

## Launch Sequence

### Step 1: Invoke Planner

```
@planner Build [feature description]
```

Planner will:

1. Decompose into tasks
2. Assign file ownership
3. Present plan for approval

### Step 2: Approve Plan

Review the decomposition. Ensure:

- No file overlap between builders
- Each builder has 5-6 tasks
- Clear deliverables defined

### Step 3: Planner Spawns Builders

Planner runs both in parallel:

```
Spawn backend-builder with: [backend tasks]
Spawn frontend-builder with: [frontend tasks]
```

Using worktrees for isolation:

```bash
claude --worktree feature-backend --agent backend-builder
claude --worktree feature-frontend --agent frontend-builder
```

### Step 4: Builders Report

Each builder reports:

- Files created/modified
- Test status
- Blockers (if any)

**Note:** Builders stage changes but do NOT commit or merge.

### Step 5: User Review (REQUIRED)

**Do NOT merge until user reviews.** Planner tells user:

```
Builders complete. Review changes in each worktree:
- Backend: .claude/worktrees/[backend-worktree]/
- Frontend: .claude/worktrees/[frontend-worktree]/

Open each folder in your IDE to review staged changes.
Reply "approved" when ready to continue.
```

User reviews each worktree's changes in their IDE before proceeding.

### Step 6: Fullstack Review

After user approves, planner spawns fullstack-reviewer.
Reviewer checks:

- Architecture compliance (isolated vs orchestration layers)
- Standards compliance
- API contract alignment
- Security basics

### Step 7: Fix Loop (if needed)

If issues found:

1. Planner identifies owner (backend or frontend)
2. Respawns appropriate builder with fix instructions
3. User reviews fixes
4. Re-runs fullstack-reviewer

### Step 8: QA Review

Planner spawns qa-reviewer to verify:

- All planned items implemented
- Tests pass, types check, lint passes
- Ready to ship

### Step 9: User Merges

After QA passes, planner provides merge instructions:

```
QA passed. Merge worktrees when ready:

1. cd .claude/worktrees/[backend-worktree] && git add -A && git commit -m "feat: [description]"
2. cd .claude/worktrees/[frontend-worktree] && git add -A && git commit -m "feat: [description]"
3. git merge [backend-branch]
4. git merge [frontend-branch]
```

### Step 10: Completion

User confirms merge complete. Planner cleans up worktrees if requested.

## Worktree Strategy

For file isolation, use worktrees:

```bash
# Terminal 1: Planner (main branch)
claude --agent planner

# Terminal 2: Backend (isolated)
claude --worktree feat-backend --agent backend-builder

# Terminal 3: Frontend (isolated)
claude --worktree feat-frontend --agent frontend-builder
```

**User-controlled merge:**

1. Builders complete work in worktrees (staged, not committed)
2. User opens each worktree folder in IDE to review
3. User commits and merges when satisfied
4. Reviewers run on merged result

## Communication Protocol

### Builder → Planner

```
STATUS: DONE | BLOCKED
FILES: [list of files]
TESTS: PASS | FAIL (details)
NOTES: [any assumptions or questions]
```

### Fullstack-Reviewer → Planner

```
STATUS: PASS | ISSUES FOUND
ARCHITECTURE: [violations]
STANDARDS: [issues]
SECURITY: [concerns]
OWNER: backend-builder | frontend-builder
```

### QA-Reviewer → Planner

```
STATUS: COMPLETE | INCOMPLETE
PLANNED VS IMPLEMENTED: [table]
MISSING: [list]
VERIFICATION: tests/types/lint pass/fail
```

### Planner → Builder (fix request)

```
FIX REQUIRED:
- [file:line] Issue description
CONTEXT: [why this matters]
```

## Quick Reference

| Command               | When                          |
| --------------------- | ----------------------------- |
| `@planner Build X`    | Start new feature             |
| `@backend-builder`    | Backend-only task             |
| `@frontend-builder`   | Frontend-only task            |
| `@fullstack-reviewer` | Architecture/standards review |
| `@qa-reviewer`        | Verify plan implemented       |
