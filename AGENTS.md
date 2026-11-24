<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MM Intelligence / Shoppainless — Codex guidance

## Project scope
- This repository is the Next.js application for MM Intelligence. Verify routes, APIs, and current product behavior in the code before describing them.
- Keep changes scoped to the relevant feature. Do not create a second app, duplicate a module, or replace an integration without checking what already exists.

## Safety and credentials
- Never commit, print, or request secrets, API keys, access tokens, cookies, or customer data. Use the existing environment-variable names and secure Vercel/Codex secret fields.
- Keep preview and production separate. Do not deploy, publish, change production data, or run destructive migrations without explicit approval.
- Prefer a focused branch and pull request for changes targeting `main`. Do not merge a pull request unless asked.

## Research and customer-facing content
- For product/ad research, separate observed facts, indirect signals, inference, and unavailable data. Never present ad counts or longevity as proof of sales, revenue, ROAS, or conversion.
- Preserve the source URL, platform, country, original currency, and collection time with each research result. Do not copy competitors' full creatives or claims.
- Use natural Spanish for Shoppainless customer-facing content when the task targets its audience. Do not make medical or performance claims without verifiable support.

## Changes and verification
- Inspect the current implementation and existing instructions before editing. Keep existing conventions and avoid unrelated refactors.
- For Next.js changes, consult the matching local Next.js guide before choosing APIs.
- Use the repository's existing scripts for validation when the task calls for it. Report what was and was not verified; do not claim a build or test passed unless it ran successfully.
