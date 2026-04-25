---
id: domain-gaming-anti-cheat
type: primary
depth_role: leaf
focus: Detect client-trusted game state, missing server-side validation of player actions, speed and teleport hack vectors, exploitable game economies, replay attacks, and leaderboard manipulation in game systems
parents:
  - index.md
covers:
  - Client-trusted position, health, score, or inventory
  - Missing server-side validation of client-reported actions
  - "Speed or teleport hack not detectable (no position delta validation)"
  - Missing rate limiting on game actions
  - Game economy exploitable via negative values or integer overflow
  - Replay attack on game actions not prevented
  - Sensitive game logic exposed in client-side code without obfuscation
  - Leaderboard accepts client-submitted scores without server verification
  - Item duplication via race condition in trade or transfer
  - Wallhack enabled by sending hidden entity positions to client
tags:
  - anti-cheat
  - cheat
  - exploit
  - server-authority
  - validation
  - game-security
  - speed-hack
  - wallhack
  - aimbot
  - economy
  - leaderboard
activation:
  file_globs:
    - "**/*cheat*"
    - "**/*anti*cheat*"
    - "**/*hack*"
    - "**/*exploit*"
    - "**/*validation*"
    - "**/*leaderboard*"
    - "**/*score*"
    - "**/*inventory*"
    - "**/*trade*"
    - "**/*economy*"
  keyword_matches:
    - anti-cheat
    - cheat
    - hack
    - exploit
    - trust
    - server authority
    - validation
    - speed hack
    - wallhack
    - aimbot
    - rate limit
    - leaderboard
    - server_authoritative
    - client_trusted
  structural_signals:
    - Server handler accepting client game state
    - Leaderboard submission endpoint
    - Game action validation function
source:
  origin: file
  path: domain-gaming-anti-cheat.md
  hash: "sha256:7cad87025db7e7b222c2f65b6ab4198d84472d9d3504e12538a3444b44d7f18f"
---
# Anti-Cheat and Game Integrity

## When This Activates

Activates when diffs touch game state validation, player action processing, leaderboard submission, game economy (currency, items, trading), or client-server trust boundaries. Any game state that the client can set without server validation is a cheat vector. The fundamental rule of multiplayer game security is: **never trust the client**.

## Audit Surface

- [ ] Server accepts client-reported position without delta or speed validation
- [ ] Server accepts client-reported health, damage, score, or currency
- [ ] Player position change exceeds maximum movement speed between ticks
- [ ] No rate limit on attack, fire, or ability usage actions
- [ ] Game currency or item quantity field accepts negative values
- [ ] Integer overflow possible on score, currency, or item count
- [ ] Game action replay not prevented by nonce or sequence number
- [ ] Client receives positions of all entities including hidden or occluded ones
- [ ] Leaderboard write endpoint accepts score directly from client
- [ ] Trade or item transfer vulnerable to race condition (item duplication)
- [ ] Server-side game logic absent -- all validation in client code
- [ ] Anti-cheat checks run only client-side
- [ ] Player action timestamps not validated against server clock
- [ ] Cooldown enforcement only in client -- server does not track ability timers

## Detailed Checks

### Server Authority and State Validation
<!-- activation: keywords=["server", "client", "trust", "authoritative", "validate", "accept", "report", "state", "position", "health", "score"] -->

- [ ] **Client-trusted game state**: server accepts client-reported values for position, health, score, inventory, or currency -- any of these can be memory-edited or packet-modified by the client. The server must compute or validate all gameplay-critical state
- [ ] **No server-side game logic**: all game rules implemented in client code with no server-side equivalent -- the client is a fully authoritative oracle that the server blindly trusts
- [ ] **Client-side-only anti-cheat**: cheat detection logic runs in the client binary -- cheaters patch it out, hook the detection functions, or run the game in a modified environment that intercepts the checks
- [ ] **Server-side validation gaps**: server validates some actions (movement) but not others (ability usage, item consumption) -- cheaters exploit the unvalidated actions

### Movement and Speed Hack Detection
<!-- activation: keywords=["position", "speed", "movement", "teleport", "delta", "velocity", "distance", "move", "coordinate"] -->

- [ ] **No position delta validation**: server does not compare consecutive position reports to check whether the distance traveled is physically possible given the tick interval and maximum movement speed -- speed hacks and teleportation go undetected
- [ ] **Teleport detection absent**: no check for position jumps exceeding a threshold -- teleportation cheats move the player across the map instantly
- [ ] **Movement validation per-tick only**: server checks each tick's movement but not cumulative path -- speed hack that moves slightly faster each tick (below per-tick threshold) accumulates undetected over time
- [ ] **No collision validation**: server does not verify that the reported position is reachable (not inside walls, terrain, or restricted areas) -- noclip and wallhack movement goes undetected

### Rate Limiting Game Actions
<!-- activation: keywords=["rate", "limit", "cooldown", "fire", "attack", "ability", "action", "frequency", "spam"] -->

- [ ] **No server-side rate limit on actions**: attack, fire, ability usage, or item consumption has no server-enforced cooldown or rate limit -- rapid-fire and ability-spam cheats operate freely
- [ ] **Cooldown tracked client-side only**: ability cooldown timers exist only in client code -- the client reports "cooldown complete" regardless of actual elapsed time
- [ ] **Action timestamp not validated**: server uses client-reported timestamps for rate limiting -- the client sends timestamps in the future to bypass cooldowns
- [ ] **Global rate limit but no per-action limit**: overall message rate is limited but individual action types are not -- a cheater sends the maximum message rate consisting entirely of high-damage attacks

### Game Economy Exploits
<!-- activation: keywords=["currency", "gold", "coin", "item", "trade", "transfer", "buy", "sell", "quantity", "economy", "negative", "overflow"] -->

- [ ] **Negative value exploit**: game currency, item quantity, or price field accepts negative values -- buying -1 items adds money instead of spending it, or trading negative currency increases the recipient's balance
- [ ] **Integer overflow on currency/score**: currency or score stored in a fixed-width integer without overflow protection -- at maximum value, adding 1 wraps to minimum (or zero), destroying accumulated value, or subtracting past zero wraps to maximum
- [ ] **Item duplication via race condition**: trade or transfer operations are not atomic -- initiating two simultaneous trades of the same item duplicates it. Use database-level atomic operations or locks
- [ ] **Price manipulation in player markets**: player-to-player market listing price accepted without bounds validation -- zero or negative prices enable item laundering or economy manipulation

### Wallhack and Information Leakage
<!-- activation: keywords=["wall", "visibility", "occlude", "hidden", "fog", "reveal", "entity", "position", "send", "network"] -->

- [ ] **All entity positions sent to client**: server sends the positions of all game entities to every client, including those behind walls or in fog of war -- the client can render them through obstructions (wallhack) by reading the network data
- [ ] **No server-side visibility culling**: server does not filter entities by the player's line of sight or area of interest -- reduces wallhack to a simple data read rather than a complex exploit
- [ ] **Hidden state in client memory**: game state that should be hidden (e.g., other players' hands in a card game, hidden map areas) exists in client memory -- memory scanners reveal it

### Replay Attacks and Leaderboard Integrity
<!-- activation: keywords=["replay", "nonce", "sequence", "leaderboard", "score", "submit", "rank", "high_score"] -->

- [ ] **No replay protection**: game actions have no nonce, sequence number, or session-bound token -- an attacker captures a valid action packet and replays it to duplicate the action
- [ ] **Leaderboard accepts client-submitted scores**: the leaderboard write endpoint accepts a score value directly from the client -- any score can be submitted. Scores must be computed server-side from authoritative game state
- [ ] **Session token reusable across sessions**: game session authentication token has no expiration or is not bound to a specific game session -- stolen or replayed tokens grant persistent access

## Common False Positives

- **Single-player games**: purely single-player games with no competitive leaderboards or shared economy do not need server authority. Flag only if there is a multiplayer or competitive component.
- **Client-side prediction values**: the client predicting its own position for responsiveness is expected -- the issue is when the server accepts the predicted value as authoritative without reconciliation.
- **Debug or development builds**: client-side cheats enabled in debug builds with `#if DEBUG` or equivalent guards are acceptable for development and testing.
- **Cooperative-only games**: games with no competitive element have lower risk from cheating; flag at reduced severity.

## Severity Guidance

| Finding | Severity |
|---|---|
| Server accepts client-reported health, score, or currency | Critical |
| Leaderboard accepts client-submitted scores | Critical |
| Item duplication via race condition in trade/transfer | Critical |
| Integer overflow on currency or score (wrap to max/zero) | Critical |
| No position delta validation (speed hack undetectable) | Important |
| No server-side rate limit on game actions | Important |
| All entity positions sent to all clients (wallhack vector) | Important |
| No replay protection on game actions | Important |
| Negative values accepted for currency or item quantities | Important |
| Cooldown enforcement client-side only | Minor |
| Movement validation per-tick only (cumulative drift) | Minor |
| Anti-cheat checks run only client-side | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- server authority is a form of access control
- `footgun-integer-overflow-sign-extension` -- overflow exploits in game economy values
- `principle-fail-fast` -- invalid game actions should be rejected immediately on the server
- `reliability-idempotency` -- game actions processed multiple times via replay

## Authoritative References

- [Valve Anti-Cheat (VAC) Developer Documentation](https://developer.valvesoftware.com/wiki/Valve_Anti-Cheat)
- [Glenn Fiedler, "Securing Dedicated Servers"](https://gafferongames.com/post/securing_dedicated_servers/)
- [Gabriel Gambetta, "Client-Server Game Architecture" (Fast-Paced Multiplayer)](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [GDC Vault, "Practical Anti-Cheat for Multiplayer Games"](https://www.gdcvault.com/)
- [OWASP Game Security Framework](https://owasp.org/www-project-game-security-framework/)
