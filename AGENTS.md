<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Naming: English everywhere in code

All identifiers are in **English** — variables, functions, types, DB tables/columns, and enum/CHECK value tokens. No exceptions.

The **only** French allowed is user-facing copy (JSX text, labels, placeholders, toasts). A French word inside an identifier is a bug — e.g. `hasBillet` should be `hasTicket` (`billet` = FR "ticket").

Known debt to migrate when touched (don't rename mid-feature without a migration):
- `participants.role`: `'créateur' | 'co_organisateur'` → `'creator' | 'co_organizer'`
- `transport_legs.direction`: `'aller' | 'retour'` → `'outbound' | 'return'`
- `transport_legs.mode`: `'navette'` → `'shuttle'`
- `hasBillet` / `isBillet` (transport components) → `hasTicket` / `isTicketed`
