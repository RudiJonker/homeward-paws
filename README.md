# Homeward Paws

Homeward Paws is an Android-first South African community app that helps reunite missing, found and sighted animals with their people.

## Development

Prerequisites: Node.js 20+, npm and an Android development environment.

```powershell
Copy-Item .env.example .env
npm install
npx expo start
```

Supabase variables may remain empty during Checkpoint 0. Never commit `.env` or a service-role key.

## Quality checks

```powershell
npm run lint
npx expo install --check
npx expo-doctor
npx expo export --platform android
```

Product requirements and checkpoint plans live in `docs/`. Read `AGENTS.md` before making changes.
