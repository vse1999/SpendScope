#!/usr/bin/env pwsh
# Git AI Commit Message Generator
# Usage: git ai-commit or git ac

$PROMPT = @'
Role: Senior Software Engineer & Git Hygiene Enforcer

Task: Analyze the provided git diff and generate a Conventional Commit message.

=== OUTPUT FORMAT ===
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]

=== STRICT RULES ===

1. TYPE (choose one, priority order):
   feat!    - Breaking feature change (adds "!" after type)
   fix!     - Breaking bug fix (adds "!" after type)
   feat     - New feature or capability
   fix      - Bug fix
   refactor - Code change that neither fixes a bug nor adds a feature
   perf     - Performance improvement
   chore    - Build process, deps, tooling, non-code changes
   docs     - Documentation only
   test     - Tests only
   style    - Formatting, semicolons, etc. (no logic change)
   ci       - CI/CD configuration
   revert   - Reverting a previous commit

   Decision priority (stop at first match):
   - Contains BREAKING CHANGE? → use ! suffix
   - Contains bug fix? → use "fix"
   - Contains new feature? → use "feat"
   - Pure refactor? → use "refactor"
   - Tests only? → use "test"
   - Docs only? → use "docs"
   - Otherwise? → use "chore"

2. SCOPE (lowercase, optional but preferred):
   - Use module/component name: auth, api, ui, db, config, deps, ci
   - Omit only if change is truly global
   - Never use vague scopes like "misc", "update", "changes"
   - No obvious scope? → Omit it completely (never force one)

3. SUBJECT (max 50 chars, imperative mood, NO period at end):
   - Start with verb: Add, Fix, Remove, Refactor, Update, Bump, Drop
   - Describe INTENT ("why"), not MECHANICS ("what"):
     ❌ Bad: "Change button color to blue"
     ✅ Good: "Improve CTA visibility for accessibility"
     ❌ Bad: "Add validateToken function"
     ✅ Good: "Validate JWT tokens before protected route access"
   - For deps: "Bump <package> to <version>"
   - For lockfiles: "Update lockfile"
   - Complete this sentence: "If applied, this commit will..."

4. BODY (include when ANY true):
   - Diff is > 20 lines
   - The "why" isn't obvious from the subject
   - There's a design decision worth documenting
   - Multiple logical changes that need explanation
   - Body rules:
     * Wrap at 72 characters
     * Explain WHY the change, not WHAT
     * Reference issues: "Closes #123", "Fixes #456", "Relates to #789"

5. FOOTER (when applicable):
   - Breaking changes: "BREAKING CHANGE: <description of what breaks and migration>"
   - Deprecations: "DEPRECATED: <description>"
   - Co-authors: "Co-authored-by: Name <email>"
   - References: "Refs: #123, #456"

=== EDGE CASES ===

- Lockfile changes only? → "chore(deps): update lockfile"
- Version bump? → "chore(release): bump version to x.y.z"
- Generated code? → "chore(gen): regenerate <what>"
- Revert? → "revert: <subject of reverted commit>"
- WIP/unready code? → Return: "ERROR: Cannot generate commit for WIP code"

=== IGNORE ===

- .todo files
- .log files
- .tmp files
- AGENTS.md, ARCHITECTURE.md, TECH_DEBT.md, PHASE3_ROADMAP.md (internal docs)
- TODO.md, PLAN.md, DRAFT.md, PROMPT.md and variants
- *.todo.md, *.draft.md, *.plan.md, *.prompt.md
- notes/*.md, drafts/*.md
- IDE/editor config files (.vscode, .idea) unless sole change

=== NEGATIVE CONSTRAINTS ===

- NO markdown formatting (no backticks, no bold, no italics)
- NO conversational filler ("Here is...", "The commit...", "Based on...")
- NO quotes around the output
- NO emojis in subject line
- NO "Signed-off-by" or similar trailers (unless in diff)

=== OUTPUT ===

Return ONLY the raw commit message.
If body is included, separate from subject with exactly one blank line.
No extra text before or after.
'@

# Check if there are staged changes
$staged = git diff --staged --name-only
if (-not $staged) {
    Write-Host "Error: No staged changes found. Stage files with 'git add' first." -ForegroundColor Red
    exit 1
}

# Get the staged diff (excluding ignored files)
$diff = git diff --staged -- . ':!*.todo' ':!*.log' ':!*.tmp' ':!AGENTS.md' ':!ARCHITECTURE.md' ':!TECH_DEBT.md' ':!PHASE3_ROADMAP.md' ':!TODO.md' ':!PLAN.md' ':!DRAFT.md' ':!PROMPT.md' ':!notes/*.md' ':!drafts/*.md'

if (-not $diff) {
    Write-Host "Error: No meaningful changes to commit (only ignored files staged)." -ForegroundColor Red
    exit 1
}

Write-Host "Generating commit message from staged changes..." -ForegroundColor Cyan

# You need to have an AI CLI tool installed. Popular options:
# 1. kimi (if available): kimi -p "$PROMPT" "$diff"
# 2. aichat: aichat "$PROMPT`n`n$diff"
# 3. sgpt (shell-gpt): sgpt "$PROMPT`n`n$diff"
# 4. Custom API call

# For now, output instructions
Write-Host "`n=== PROMPT READY ===" -ForegroundColor Green
Write-Host "Copy the prompt above and paste it into your AI tool along with the diff." -ForegroundColor Yellow
Write-Host "`nTo get the diff, run: git diff --staged" -ForegroundColor Yellow
Write-Host "`nOr install an AI CLI tool and modify this script to call it." -ForegroundColor Yellow
