---
name: ui-feedback
description: Record UI/UX feedback from user review session, appended to docs/UI-FEEDBACK.md with date, component, and status
disable-model-invocation: true
---

Ask the user:
1. Which component or page is the feedback about?
2. What is the feedback? (describe the issue or desired change)
3. Status: approved / pending / rejected

Then append to `docs/UI-FEEDBACK.md` (create if missing):

```
## {date} — {component}
**Status**: {approved|pending|rejected}
**Feedback**: {feedback text}
```

If the file doesn't exist yet, create it with a header:
```
# UI/UX Feedback Log
Tracked adjustments from user review sessions.
```

After appending, confirm: "Feedback recorded in docs/UI-FEEDBACK.md"
