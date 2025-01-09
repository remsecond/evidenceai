# Development Protocol

## Session Start Checklist
1. Review last working demo video/proof
2. State what specific feature will be built this session
3. Confirm we can process one real file or show one working page
4. Verify current main branch is in working state

## Core Rules

### 1. The "Run It Now" Rule
- [ ] Every session MUST end with a runnable demo
- [ ] All new code MUST be tested with real data
- [ ] No "we'll fix it later" exceptions
- [ ] If it doesn't run, we don't move forward

### 2. The "One File" Test
- [ ] Process one real file end-to-end before any new features
- [ ] Show actual output, not just logs
- [ ] No architecture discussions until basic processing works
- [ ] Document the test file and results

### 3. Concrete Proof Requirements
For any feature:
- [ ] Website: Must show in browser
- [ ] Processing: Must handle real document
- [ ] API: Must show actual request/response
- [ ] No theoretical "it will work when..." promises

### 4. Three-Strike System
Stop and revert if we catch:
1. Writing untested code
2. Planning before basics work
3. Adding complexity to non-working components

### 5. Daily Working Demo
- [ ] Record demo video of working features
- [ ] Save demo files and outputs
- [ ] Document what works and what doesn't
- [ ] No exceptions - if we can't demo it, it doesn't exist

## Session Protocol

### Start of Session
1. Dev Manager Status Check:
   - [ ] Review this protocol
   - [ ] Verify last working demo
   - [ ] State today's specific goal
   - [ ] Confirm we have test files ready

2. Feature Implementation:
   - [ ] Start with smallest working piece
   - [ ] Test with real data
   - [ ] Show working output
   - [ ] Only then consider improvements

3. End of Session:
   - [ ] Demo working features
   - [ ] Record proof of functionality
   - [ ] Document what was completed
   - [ ] Save all test files and outputs

## Enforcement

If any rule is violated:
1. Immediately stop development
2. Revert to last working state
3. Rebuild from there with simpler approach

## Session Documentation Template

```
Date: [DATE]
Last Working Demo: [LINK/PATH]
Today's Goal: [SPECIFIC FEATURE]

Starting State:
- What works now: [LIST]
- Test files ready: [YES/NO]
- Current limitations: [LIST]

End of Session:
- Working features: [LIST]
- Demo recording: [LINK/PATH]
- Test files: [PATHS]
- Known issues: [LIST]
```

## Remember

1. Working code > Perfect code
2. Real output > Planned features
3. Simple + Working > Complex + Broken
4. Today's demo > Tomorrow's promise

Start every session by reviewing this protocol. No exceptions.
