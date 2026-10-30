# Homeward Paws Supabase CLI access on Windows

The hosted project linked to this repository is `krpihktxtivossbfuziq`. Its local link is stored in `supabase/.temp/project-ref`. A successful `supabase link` or a connected VS Code extension does not choose which Supabase account the CLI uses: hosted commands also need a Management API access token.

On this Windows computer, the interactive VS Code terminal and Codex's process have repeatedly resolved different saved CLI credentials. The project link was correct and no `SUPABASE_ACCESS_TOKEN` or `SUPABASE_PROJECT_ID` environment override was present. Relinking the project does not fix that account mismatch. Supabase documents that `SUPABASE_ACCESS_TOKEN` overrides saved login credentials, so the scripts below use a project-scoped token for each command instead of the ambiguous default credential.

## One-time setup

1. In the Supabase Dashboard account that owns Homeward Paws, create a personal access token scoped to the **Homeward Paws project only**. Give it **Projects (account-wide): Read**, **Project Settings: Read**, and **Database: Read** for read-only checks. Add write permissions only when a deployment task requires them. Choose an expiration appropriate for the work; the script will report when the token has expired.
2. In the VS Code PowerShell terminal at this repository root, run:

   ```powershell
   powershell -NoProfile -File scripts/set-homeward-paws-cli-token.ps1
   ```

3. Paste the token at the hidden prompt. Do not put it in a command line, chat, `.env`, or Git. The setup script checks that the token lists only Homeward Paws, then saves it outside the repository under `%LOCALAPPDATA%\HomewardPaws\supabase-cli-token.dpapi`, encrypted for the current Windows user.
4. Verify from either the VS Code terminal or a Codex command:

   ```powershell
   powershell -NoProfile -File scripts/supabase-hp.ps1 projects list
   ```

## Daily use

Prefix hosted CLI commands with the project wrapper, for example:

```powershell
powershell -NoProfile -File scripts/supabase-hp.ps1 migration list --linked
powershell -NoProfile -File scripts/supabase-hp.ps1 db query --linked --agent yes --output-format json "select count(*) from public.profiles;"
```

The wrapper checks both the local project link and the token's single-project scope before executing the requested command. It sets `SUPABASE_ACCESS_TOKEN` only inside its child PowerShell process and clears it afterward. It rejects a different `--project-ref` and connection/profile overrides. The token's Supabase permissions still determine which commands can run. For schema changes, keep the required `migration list --linked` and `db push --dry-run` preflight; the wrapper does not replace review or approval.

If the token expires or is revoked, create a new scoped token and rerun the setup script. Revoke an old token in the Dashboard when it is no longer needed. The encrypted local file is not a backup of the token and should not be shared.
