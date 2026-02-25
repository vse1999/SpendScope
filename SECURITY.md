# Security Policy

## Supported Version

Security fixes are applied to the latest code on `master`.

## Reporting a Vulnerability

Please do not post unpatched vulnerabilities in public issues.

Use one of these channels:

1. GitHub Security Advisory (preferred for public repository workflows)
2. Direct contact with repository maintainer via GitHub

Include:

- affected endpoint/feature
- reproduction steps
- impact assessment
- proof-of-concept (if available)

## Response Targets

- Initial acknowledgment: within 72 hours
- Triage decision: within 7 days
- Fix timeline: depends on severity and exploitability

## Disclosure Policy

1. We validate and reproduce the report.
2. We prepare and test a fix.
3. We release the patch.
4. We publish disclosure details after remediation.

## Scope Notes

For this project, highest-priority classes are:

- authentication/authorization bypass
- multi-tenant data isolation issues
- billing and webhook integrity flaws
- injection vulnerabilities (including CSV formula injection in exports)
- secret leakage in code, logs, or CI artifacts
