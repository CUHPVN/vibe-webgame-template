---
name: web-game-release
description: Use when auditing bundle size budgets, checking platform compliance (itch.io, CrazyGames, Poki, Discord Activities, Cloudflare Pages), auditing third-party asset licenses, or preparing release builds.
---

# Web Game Release & Compliance Gate

Run these checks before shipping to any portal or static host:

1. **Bundle Size Audit**:
   - Run `npm run build && npm run budget` (add `-- --strict-poki` or `-- --strict-crazygames` when targeting those portals).
   - Poki target: `<= 5 MB` initial load, `<= 8 MB` total.
   - CrazyGames limit: `<= 20 MB` mobile initial (`<= 50 MB` desktop), `<= 250 MB` total, `<= 1,500` files, runs smoothly on 4 GB RAM Chromebook.
   - Cloudflare Pages hard limit: `<= 25 MiB` per file, `<= 20,000` files.
   - itch.io hard limit: `<= 200 MB` per file, `<= 500 MB` extracted, `<= 1,000` files, `index.html` at ZIP root, relative asset paths (`base: './'`).
2. **Portal Technical Rules**:
   - **Poki**: Block/remove ALL external requests (fonts, CDNs, analytics), survive Incognito (`SafeStorage`), survive AdBlockers, support 16:9, integrate Poki SDK lifecycle.
   - **Discord Activities**: Wrap network/WS URLs via `@discord/embedded-app-sdk` `patchUrlMappings` or `@robojs/patch` for `*.discordsays.com` CSP.
3. **Asset License Check (`credits.txt`)**:
   - Confirm every sprite, 3D model, audio clip, and font is CC0 or properly attributed CC-BY in `credits.txt`.
   - Never ship `CC BY-NC` in ad/paid games; verify Mixamo assets are bundled (never redistributed standalone).
4. **Final Verification**: Run `npm run verify` with zero errors before tagging release.
