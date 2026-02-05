#!/usr/bin/env pwsh
# Git AI Commit Message Generator with Kimi CLI
# Usage: git ai-commit or git ac
# Requirements: kimi CLI installed (npm install -g @kimi-ai/cli)

[Diagnostics.CodeAnalysis.SuppressMessageAttribute("PSUseDeclaredVarsMoreThanAssignments", "")]
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

2. SCOPE (lowercase, optional but preferred):
   - Use module/component name: auth, api, ui, db, config, deps, ci
   - Omit only if change is truly global

3. SUBJECT (max 50 chars, imperative mood, NO period at end):
   - Start with verb: Add, Fix, Remove, Refactor, Update, Bump, Drop
   - Describe INTENT ("why"), not MECHANICS ("what")

4. BODY (include when diff is > 20 lines or "why" isn't obvious):
   - Wrap at 72 characters
   - Explain WHY the change, not WHAT

5. FOOTER (when applicable):
   - Breaking changes: "BREAKING CHANGE: <description>"

=== OUTPUT ===
Return ONLY the raw commit message. No markdown, no quotes, no filler text.
'@

# Check if kimi CLI is installed
$kimiPath = Get-Command kimi -ErrorAction SilentlyContinue
if (-not $kimiPath) {
    Write-Host "Error: Kimi CLI not found. Install with: npm install -g @kimi-ai/cli" -ForegroundColor Red
    exit 1
}

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

Write-Host "Analyzing staged changes with Kimi AI..." -ForegroundColor Cyan
Write-Host "(This may take a few seconds)" -ForegroundColor Gray

# Generate commit message using Kimi CLI
try {
    # Combine prompt and diff, then pipe to kimi
    $fullInput = "$PROMPT`n`n=== GIT DIFF ===`n$diff"
    $commitMessage = $fullInput | kimi -p "-"
    
    if (-not $commitMessage) {
        Write-Host "Error: Kimi returned empty response." -ForegroundColor Red
        exit 1
    }
    
    # Clean up the message (remove any markdown code blocks if present)
    $commitMessage = $commitMessage -replace '```\w*\n?', '' -replace '```', ''
    $commitMessage = $commitMessage.Trim()
    
} catch {
    Write-Host "Error calling Kimi CLI: $_" -ForegroundColor Red
    exit 1
}

# Display the generated message
Write-Host "`n=== Generated Commit Message ===" -ForegroundColor Green
Write-Host $commitMessage -ForegroundColor Cyan

# Copy to clipboard (Windows)
try {
    $commitMessage | Set-Clipboard
    Write-Host "`n✓ Copied to clipboard" -ForegroundColor Gray
} catch {
    Write-Host "`n(Clipboard copy failed - select and copy manually)" -ForegroundColor Yellow
}

# Ask for confirmation
Write-Host "`nOptions:" -ForegroundColor Yellow
Write-Host "  [y] Commit with this message" -ForegroundColor Green
Write-Host "  [e] Edit message before commit" -ForegroundColor Yellow
Write-Host "  [n] Cancel" -ForegroundColor Red

$choice = Read-Host "`nYour choice"

switch ($choice.ToLower()) {
    'y' {
        git commit -m "$commitMessage"
        Write-Host "`n✓ Committed successfully!" -ForegroundColor Green
    }
    'e' {
        # Save to temp file for editing
        $tempFile = [System.IO.Path]::GetTempFileName()
        $commitMessage | Set-Content $tempFile
        
        # Open in default editor (VS Code if available)
        $editor = if (Get-Command code -ErrorAction SilentlyContinue) { "code" } else { "notepad" }
        & $editor $tempFile
        
        Write-Host "`nEditor opened. Save and close, then press Enter to continue..." -ForegroundColor Yellow
        [void][System.Console]::ReadLine()
        
        $editedMessage = Get-Content $tempFile -Raw
        Remove-Item $tempFile
        
        if ($editedMessage.Trim()) {
            git commit -m "$editedMessage"
            Write-Host "`n✓ Committed with edited message!" -ForegroundColor Green
        } else {
            Write-Host "`n✗ Cancelled - empty message" -ForegroundColor Red
        }
    }
    default {
        Write-Host "`n✗ Cancelled" -ForegroundColor Red
        exit 0
    }
}
