# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-01 19:51]
npm, vitest, and php commands are blocked by a callback hook in this worktree environment, even though Bash(*) is allowed in .claude_settings.json

_Context: When trying to run subtask-4-1 (test suite verification), all test/build commands were blocked. Manual code review was performed instead. The test suite needs to be run in the main repository before merging._
