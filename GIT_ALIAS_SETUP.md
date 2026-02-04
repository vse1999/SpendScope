# Git AI Commit Alias Setup

## Quick Setup (Cross-Platform)

### 1. Add the Git Alias

Run this command to add the alias to your global git config:

```bash
# Using the inline prompt (recommended)
git config --global alias.ai-commit '!f() {
  PROMPT="Role: Senior Software Engineer \& Git Hygiene Enforcer

Task: Analyze the provided git diff and generate a Conventional Commit message.

=== OUTPUT FORMAT ===
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]

=== STRICT RULES ===
1. TYPE priority: breaking? → fix? → feat? → refactor? → chore
2. SCOPE: module name (auth, api, ui) or omit if unclear
3. SUBJECT (max 50 chars, imperative, no period): Focus on INTENT, not mechanics
4. BODY (when diff > 20 lines or non-obvious): Explain WHY, wrap at 72 chars
5. FOOTER: BREAKING CHANGE, DEPRECATED, Co-authored-by, Refs

=== IGNORE ===
.todo, .log, .tmp, AGENTS.md, ARCHITECTURE.md, TECH_DEBT.md, PHASE3_ROADMAP.md, TODO.md, PLAN.md, DRAFT.md, PROMPT.md, *.todo.md, *.draft.md, notes/*.md, drafts/*.md

=== NEGATIVE CONSTRAINTS ===
NO markdown, NO filler, NO quotes, NO emojis, NO Signed-off-by

=== OUTPUT ===
Return ONLY the raw commit message.";
  
  if git diff --staged --quiet; then
    echo "Error: No staged changes. Run git add first." >&2;
    exit 1;
  fi;
  
  echo "$PROMPT";
  echo "";
  git diff --staged -- . ":!*.todo" ":!*.log" ":!AGENTS.md" ":!ARCHITECTURE.md" ":!TECH_DEBT.md" ":!PHASE3_ROADMAP.md" ":!TODO.md" ":!PLAN.md" ":!DRAFT.md" ":!PROMPT.md" ":!notes/*.md" ":!drafts/*.md";
}; f'

# Add short alias too
git config --global alias.ac "!git ai-commit"
```

### 2. Usage

```bash
# Stage your changes
git add .

# Generate commit message (outputs prompt + diff, copy to AI)
git ai-commit

# Or use the short alias
git ac
```

The alias outputs the prompt and the filtered diff. Copy both to your AI tool (Kimi, ChatGPT, Claude, etc.) and paste back the generated message.

---

## Advanced Setup (With AI CLI Integration)

If you have an AI CLI tool installed (`aichat`, `sgpt`, or similar), use the full script:

### Step 1: Copy the script

**Linux/macOS:**
```bash
mkdir -p ~/.config
cp scripts/git-commit-ai.sh ~/.config/git-commit-ai.sh
chmod +x ~/.config/git-commit-ai.sh
```

**Windows (PowerShell):**
```powershell
# Copy the .ps1 version
Copy-Item .git-commit-ai.ps1 $env:USERPROFILE\.config\git-commit-ai.ps1
```

### Step 2: Edit the script

Uncomment the AI tool section you use:

```bash
# For aichat (recommended)
MESSAGE=$(echo -e "$PROMPT\n\n$DIFF" | aichat --no-stream)
```

### Step 3: Update git alias

```bash
git config --global alias.ai-commit "!~/.config/git-commit-ai.sh"
git config --global alias.ac "!git ai-commit"
```

### Step 4: Usage with auto-commit

```bash
git add .
git ai-commit | aichat --no-stream | git commit -F -
```

Or create a convenience alias:
```bash
git config --global alias.cma '!f() { git add . && git diff --staged | aichat -r commit-generator | git commit -F -; }; f'
```

---

## Files Ignored from Diff Analysis

These files are excluded when generating the commit message:

| Pattern | Reason |
|---------|--------|
| `*.todo`, `*.log`, `*.tmp` | Temporary/working files |
| `AGENTS.md` | Internal AI instructions |
| `ARCHITECTURE.md` | Internal architecture docs |
| `TECH_DEBT.md` | Internal tracking |
| `PHASE3_ROADMAP.md` | Internal planning |
| `TODO.md`, `PLAN.md`, `DRAFT.md`, `PROMPT.md` | Working documents |
| `*.todo.md`, `*.draft.md`, etc. | Working document variants |
| `notes/*.md`, `drafts/*.md` | Working directories |

**Essential .md files that ARE analyzed:**
- `README.md`
- `CHANGELOG.md`
- `LICENSE.md`
- `CONTRIBUTING.md`
- `docs/**/*.md` (actual documentation)

---

## Verifying Your Setup

```bash
# Check if alias exists
git config --global alias.ai-commit

# List all aliases
git config --global --get-regexp alias

# Test (stage a small change first)
git ai-commit
```

---

## Troubleshooting

**"No staged changes" error:**
- Run `git add <files>` before `git ai-commit`

**".git-commit-ai.sh not found" (Windows):**
- Use the PowerShell version: `.git-commit-ai.ps1`
- Or use WSL with the bash version

**AI tool not found:**
- Install one of: `aichat`, `sgpt`, or create a custom API script
- Or use the manual copy-paste method
