# hara-zalous v0.3.1

## Highlights

- Rework Market Manager UI to a Spicetify-style marketplace panel.
- Full theme-sync pass for market + mail surfaces.
- Runtime compatibility fixes validated through CDP.

## Market UI

- Replace inline-styled market popup with semantic layout + shared style layer.
- Add theme-aware palette sampling (`--zm-*`) so market follows current theme-pack colors.
- Improve sections, actions, hover/focus states, and responsive behavior.
- Restore `window.zalous.openMarket()` compatibility for automation and scripting.

## Email Workspace

- Improve adaptive layout for narrow and wide viewports.
- Sync mail palette from live runtime CSS vars first, then theme-name fallback.
- Add runtime theme-change observer for immediate palette updates.
- Fix main panel detection for newer Zalo layouts (including onboarding panel).
- Add demo mailbox fallback when IMAP socket bridge is unavailable in renderer runtime.

## Validation

- CDP baseline and post-change checks: `pass=true`.
- Confirmed:
  - market modal opens and renders new panel.
  - email pinned item opens mail workspace.
  - theme remains `pack:themepack.console-minimal`.
  - enabled extension list still includes `email-prototype.js`.
