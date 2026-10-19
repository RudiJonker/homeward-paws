# Homeward Paws — Codex Handoff Pack

Everything Codex needs to build the Homeward Paws Android app: the planning documents (updated October 2026), repo instructions, kickoff prompts and every app graphic.

## How to use it

1. Create (or open) the app repository in VS Code.
2. Copy into the repository root: `AGENTS.md`, `docs/`, `assets/`. Keep `prompts/` and `store/` outside the app if you prefer; they are not part of the build.
3. Commit, so Codex reads the same files you do.
4. Open Codex and paste `prompts/CODEX_PROMPT_CHECKPOINT_0.md`.
5. When Checkpoint 0 passes its exit gate (including the APK on a physical phone), paste `prompts/CODEX_PROMPT_CHECKPOINT_1.md`.

Codex reads `AGENTS.md` automatically at the start of every session, so the product rules travel with the repo.

## Contents

| Path | What it is |
|---|---|
| `AGENTS.md` | Repo-root instructions for Codex |
| `docs/00`–`06`, `CODEX_PROJECT_INSTRUCTIONS.md` | Original planning baseline, updated with October 2026 decisions |
| `docs/04_DESIGN_SYSTEM.md` | v1.1 warm design system |
| `docs/07_BRAND_AND_ASSETS.md` | New: where every graphic goes, Expo config, icon mapping |
| `docs/08_LEGAL_AND_PLAY_COMPLIANCE.md` | New: website URLs, what the app must do to match them, permissions, Data safety answers, Play Console checklist |
| `docs/visuals/` | Asset contact sheets and the mood reference |
| `assets/` | App icon, adaptive and themed icons, splash, notification icon, logos, map pins, category placeholders, illustrations |
| `store/` | Play Console hi-res icon and feature graphic |
| `prompts/` | Checkpoint 0 and Checkpoint 1 kickoff prompts |

## What changed in the docs

- **Blueprint:** design summary rewritten for v1.1; the outstanding-items list now separates decided items (logo, icons, contact email, website and legal URLs, minimum age 18) from open ones.
- **Project instructions:** new rules on supplied assets, icons and fonts, 18+ accounts, the single contact email, no broad photo or background-location permissions, and matching the published legal pages.
- **Supabase plan:** content-report reasons including Child safety, the published retention periods, and the account-deletion procedure.
- **Screens, roadmap and testing:** Contact Support email, in-app deletion and age confirmation in Checkpoint 1, and a Google Play compliance pass and test section for Checkpoint 5.

## Still to decide (non-blocking)

Map/geocoding provider, Auth email provider, Supabase region, AdMob IDs, Information Officer and child-safety contact names, and confirmation of the `homewardpaws.co.za` domain.
