---
name: sprint-status
description: Show current sprint status — uncommitted changes, recent commits, test count, open redesign phases
disable-model-invocation: true
---

Run these commands and summarize the output:

1. `git status --short` — uncommitted files
2. `git log --oneline -10` — last 10 commits
3. `npm run test:run 2>&1 | tail -4` — test count
4. `ls docs/mockups/ 2>/dev/null` — mockup files

Then output a structured summary:

## Sprint Status — {today's date}

### Uncommitted changes
List files with status (M/A/??)

### Last 10 commits
List them

### Tests
Show pass/fail count

### Redesign v2.0 phases
- Phase 1 Design System: DONE
- Phase 2 Dashboard: DONE
- Phase 3 Calendrier: DONE
- Phase 4 Activités: DONE
- Phase 5 Projets+Consultants: DONE
- Phase 6 Polish: EN COURS

### Next action
Based on git status and memory, suggest the most logical next step.
