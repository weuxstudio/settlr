# Landing page and workspace entry verification

## Automated checks

- `npm run check`: 0 errors and 0 warnings.
- `npm test`: 23 tests passed across 4 files.
- `npm run build`: Cloudflare production build completed.
- `git diff --check`: passed.

New regression cases cover the server session boundary, session-store failures, malformed sessions, create-intent consumption, legacy anchors, signature rejection, connection rejection and network switching. A wallet address alone never counts as a server session.

## Browser checks

Checked the landing page and signed-out workspace at 360, 768 and 1440 CSS pixels using the Codex in-app browser. The narrower screenshot content width at some sizes reflects the browser scrollbar. No horizontal overflow was observed.

Verified navigation to `/app`, the legacy `/#requests` redirect, documentation links, FAQ expansion, keyboard activation and the missing-wallet message. A separate local fixture proxy intercepted every API route and supplied a simulated wallet. No real signature, database write or payment was submitted through the fixture.

The fixture verified:

- Network-switch progress followed by sign-in and the authenticated workspace.
- `intent=create` opens the request modal once and is removed from the address.
- Reload restores the fixture session without reopening the modal.
- An account-change event immediately removes the dashboard and returns to sign-in.
- A rejected signature leaves the dashboard inaccessible.
- An unavailable session service shows a retry action; retry recovers when the fixture service returns.
- The landing page issues no API requests (empty intercepted API request log).
- Keyboard FAQ expansion works with reduced motion enabled; hero animation styles are absent.
- The request modal retains its existing page scroll lock.

The fixture server was temporary and is not part of the application or deployment.

## Remaining external acceptance

The sign-in logic was tested using a controlled provider. A new manual pass with real MetaMask and Rabby extensions is still required for wallet-specific acceptance. This change does not enable Mainnet payments or deploy the application.
