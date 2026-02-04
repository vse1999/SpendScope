#!/bin/bash
# Git AI Commit Message Generator
# Usage: git ai-commit or git ac
# 
# SETUP INSTRUCTIONS:
# 1. Save this file to ~/.config/git-commit-ai.sh
# 2. Make executable: chmod +x ~/.config/git-commit-ai.sh
# 3. Add alias to ~/.gitconfig:
#    [alias]
#        ai-commit = !~/.config/git-commit-ai.sh
#        ac = !~/.config/git-commit-ai.sh
#
# REQUIREMENTS: An AI CLI tool installed:
# - aichat: https://github.com/sigoden/aichat
# - sgpt (shell-gpt): https://github.com/TheR1D/shell_gpt
# - Custom OpenAI API script

set -e

PROMPT='Role: Senior Software Engineer & Git Hygiene Enforcer

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
No extra text before or after.'

# Check for staged changes
if ! git diff --staged --quiet --exit-code 2>/dev/null; then
    :
else
    echo "Error: No staged changes found. Stage files with 'git add' first."
    exit 1
fi

# Get staged diff, excluding internal files
DIFF=$(git diff --staged -- . \
    ':!*.todo' ':!*.log' ':!*.tmp' \
    ':!AGENTS.md' ':!ARCHITECTURE.md' ':!TECH_DEBT.md' ':!PHASE3_ROADMAP.md' \
    ':!TODO.md' ':!PLAN.md' ':!DRAFT.md' ':!PROMPT.md' \
    ':!*.todo.md' ':!*.draft.md' ':!*.plan.md' ':!*.prompt.md' \
    ':!notes/*.md' ':!drafts/*.md' 2>/dev/null || true)

if [ -z "$DIFF" ]; then
    echo "Error: No meaningful changes to commit (only ignored files staged)."
    exit 1
fi

echo "Generating commit message..." >&2

# Try different AI CLI tools (uncomment the one you use)

# Option 1: aichat (recommended)
# MESSAGE=$(echo -e "$PROMPT\n\n$DIFF" | aichat --no-stream)

# Option 2: shell-gpt
# MESSAGE=$(echo -e "$PROMPT\n\n$DIFF" | sgpt)

# Option 3: Custom OpenAI API call (requires OPENAI_API_KEY)
# MESSAGE=$(curl -s https://api.openai.com/v1/chat/completions \
#   -H "Authorization: Bearer $OPENAI_API_KEY" \
#   -H "Content-Type: application/json" \
#   -d "$(jq -n --arg prompt "$PROMPT" --arg diff "$DIFF" '{
#     model: "gpt-4o-mini",
#     messages: [
#       {role: "system", content: "You are a senior software engineer."},
#       {role: "user", content: ($prompt + "\n\n" + $diff)}
#     ],
#     temperature: 0.3
#   }')" | jq -r '.choices[0].message.content')

# For now, output to clipboard with instructions
echo "Copy this prompt and your diff to an AI tool:" 
echo "========================================="
echo "$PROMPT"
echo "========================================="
echo ""
echo "Then run: git diff --staged | <your-ai-tool>"

# Optional: Copy prompt to clipboard (macOS/Linux)
# echo "$PROMPT" | pbcopy 2>/dev/null || echo "$PROMPT" | xclip -selection clipboard 2>/dev/null || true
