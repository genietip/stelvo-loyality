# Stelvo Loyalty

Expo / React Native customer loyalty app, exported from the Stelvo workspace.

## Contents
- artifacts/loyalty-app: mobile app
- lib: shared API client, OpenAPI specification, validation and workspace packages
- scripts: workspace maintenance utilities

The backend and merchant website are in https://github.com/genietip/stelvo.
This repository does not include the backend. Shared packages are snapshots, not automatically synchronized between repositories.

## Setup
Use Node.js 22+ and pnpm 10. Run `pnpm install --no-frozen-lockfile`, then `pnpm run typecheck:libs`.
The source lockfile includes importers from the original workspace; installing refreshes it for this subset.

Set EXPO_PUBLIC_DOMAIN to the HTTPS backend host, without https:// (for example api.example.com). It must serve the API at /api.
Start locally with `pnpm --filter @workspace/loyalty-app exec expo start`, then open using a compatible Expo Go client.
The original dev/build/serve scripts include Replit-specific preview behavior; use the Expo command above outside Replit.

The original workspace restricts some native optional dependency platforms in pnpm-workspace.yaml. For macOS/Windows installation, remove platform-exclusion overrides (entries set to '-') before installing.

## Security and status
No credentials, database contents, uploaded references, or prior Git history are included.
Never put backend credentials in EXPO_PUBLIC_ variables.
At export, the configured Supabase endpoint was unreachable. Login requires the backend's database connection to be restored; exporting the code does not fix that outage.
