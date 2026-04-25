---
id: domain-blockchain-smart-contracts
type: primary
depth_role: leaf
focus: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts
parents:
  - index.md
covers:
  - Reentrancy vulnerability from external call before state update
  - tx.origin used for authentication instead of msg.sender
  - Unchecked external call return value
  - Integer overflow in Solidity versions before 0.8
  - Oracle manipulation via single-source price feed
  - Gas-heavy loops on unbounded arrays
  - Missing access control on sensitive functions
  - Front-running vulnerability on state-changing transactions
  - Missing events for state changes
  - Upgradeable proxy storage collision
  - Timestamp dependence for critical logic
  - Denial of service via unbounded iteration
  - Reentrancy guards — checks-effects-interactions, ReentrancyGuard
  - Gas optimization — storage vs memory, tight packing, unchecked blocks
  - Integer overflow — pre-0.8 SafeMath vs 0.8+ built-in checks
  - Access control — Ownable, AccessControl, custom modifiers
  - Upgrade patterns — proxy storage layout, initializer safety, UUPS vs Transparent
  - Oracle trust — Chainlink staleness, TWAP manipulation
  - Front-running — MEV, commit-reveal, slippage protection
  - Storage layout — slot collisions, struct packing, mappings
  - ERC standard compliance — ERC-20, ERC-721, ERC-1155 edge cases
  - External call safety — low-level call return values, delegatecall hazards
tags:
  - solidity
  - smart-contract
  - blockchain
  - web3
  - reentrancy
  - gas
  - oracle
  - ERC20
  - ERC721
  - ERC1155
  - proxy
  - front-running
  - access-control
  - DeFi
  - ethereum
  - smart-contracts
  - defi
  - security
  - evm
aliases:
  - lang-solidity
activation:
  file_globs:
    - "**/*.sol"
    - "**/*contract*"
    - "**/*hardhat*"
    - "**/*foundry*"
    - "**/*deploy*"
  keyword_matches:
    - Solidity
    - contract
    - blockchain
    - web3
    - ethers
    - viem
    - hardhat
    - foundry
    - reentrancy
    - gas
    - oracle
    - ERC20
    - ERC721
    - ERC1155
    - modifier
    - payable
    - msg.sender
    - tx.origin
    - delegatecall
    - proxy
    - selfdestruct
  structural_signals:
    - solidity_contract_definition
    - external_call_pattern
    - modifier_usage
    - proxy_upgrade_pattern
    - oracle_price_fetch
source:
  origin: file
  path: domain-blockchain-smart-contracts.md
  hash: "sha256:86c76303dd812c360c3ae1bb57b65595b5ecce053028f37bad9f1baaba97bd80"
---
# Blockchain: Smart Contracts

## When This Activates

Activates on diffs involving Solidity contracts, Hardhat/Foundry configurations, smart contract deployment scripts, or Web3 integration code (ethers.js, viem). Smart contract bugs are uniquely severe: deployed contracts are immutable (or require complex proxy upgrades), handle real financial value, and execute in an adversarial environment where every transaction is visible in the mempool before confirmation. A single reentrancy, access control, or oracle manipulation bug can drain an entire contract's funds within one block. This reviewer detects the most critical smart contract pitfalls.

## Audit Surface

- [ ] External call before state update (reentrancy)
- [ ] tx.origin for authorization
- [ ] Unchecked low-level call return value
- [ ] Arithmetic without overflow protection (Solidity <0.8)
- [ ] Single-source price oracle
- [ ] Loop over unbounded storage array
- [ ] Missing access control on sensitive function
- [ ] Front-running vulnerability
- [ ] State change without event emission
- [ ] Proxy storage collision in upgradeable contract
- [ ] block.timestamp as randomness or critical deadline
- [ ] Ether/token transfer to unvalidated address
- [ ] selfdestruct in upgradeable contract
- [ ] delegatecall to user-supplied address

## Detailed Checks

### Reentrancy and External Call Safety
<!-- activation: keywords=["call", "send", "transfer", "external", "reentrancy", "reentrant", "nonReentrant", "checks-effects-interactions", "CEI", "callback", "receive", "fallback"] -->

- [ ] **Classic reentrancy**: flag external calls (`address.call`, `.send`, `.transfer`, or calls to untrusted contracts) that occur before the calling function updates its own state variables -- an attacker's fallback/receive function re-enters the original function and repeats the action (e.g., withdraw) before the balance is decremented
- [ ] **Cross-function reentrancy**: flag contracts where function A makes an external call and function B reads state that function A has not yet updated -- reentrancy through function B using stale state
- [ ] **Missing ReentrancyGuard**: flag contracts handling value transfers that do not use OpenZeppelin's `ReentrancyGuard` or equivalent mutex -- even with checks-effects-interactions, a guard provides defense in depth
- [ ] **Unchecked call return value**: flag low-level `call` return values that are not checked -- a failed `.call{value: amount}("")` returns `false` silently; the caller continues as if the transfer succeeded

### Access Control
<!-- activation: keywords=["owner", "admin", "modifier", "onlyOwner", "access", "role", "require", "msg.sender", "tx.origin", "auth", "AccessControl", "Ownable"] -->

- [ ] **tx.origin for authentication**: flag `require(tx.origin == owner)` or similar -- tx.origin is the original external account that initiated the transaction, not the immediate caller; a phishing contract can trick the owner into calling it, passing the tx.origin check
- [ ] **Missing access control**: flag public or external functions that modify critical state (set oracle address, withdraw funds, pause contract, change fees) with no `onlyOwner`, `onlyRole`, or equivalent modifier
- [ ] **Centralization risk without timelock**: flag single-owner contracts where the owner can unilaterally change critical parameters (fee rates, oracle address, pause) without a timelock or multisig -- users have no time to exit before adverse changes take effect
- [ ] **Incorrect modifier ordering**: flag functions with multiple modifiers where the execution order matters but is not verified -- Solidity executes modifiers left to right; a nonReentrant guard must execute before access control to prevent gas-wasting attacks

### Integer Arithmetic and Type Safety
<!-- activation: keywords=["overflow", "underflow", "SafeMath", "unchecked", "uint", "int", "cast", "type", "0.7", "0.6", "0.5", "0.4"] -->

- [ ] **Overflow in Solidity <0.8**: flag arithmetic operations on uint256/int256 in contracts compiled with Solidity <0.8.0 that do not use SafeMath or equivalent -- pre-0.8 Solidity silently wraps on overflow/underflow
- [ ] **Unsafe unchecked block**: flag `unchecked { }` blocks in Solidity >=0.8 that contain arithmetic on user-supplied or externally-derived values -- unchecked re-enables silent overflow; use only when overflow is mathematically impossible
- [ ] **Unsafe downcast**: flag narrowing casts (`uint256` to `uint128`, `uint96`, etc.) without range validation -- the upper bits are silently truncated, potentially wrapping a large value to a small one

### Oracle Manipulation and Price Feeds
<!-- activation: keywords=["oracle", "price", "feed", "Chainlink", "TWAP", "spot", "pool", "reserve", "getReserves", "latestRoundData", "manipulation", "flash loan"] -->

- [ ] **Single-source price oracle**: flag price feeds that query a single DEX pool's spot price (e.g., Uniswap `getReserves`) -- an attacker can manipulate the spot price within a single transaction using a flash loan; use Chainlink, TWAP, or multi-source medianized oracles
- [ ] **Stale oracle data**: flag Chainlink `latestRoundData` calls that do not check the `updatedAt` timestamp against a staleness threshold -- stale price data from a paused or delayed oracle can trigger incorrect liquidations or mispricing
- [ ] **Oracle roundId not validated**: flag Chainlink oracle usage that does not verify `answeredInRound >= roundId` -- an incomplete round returns stale data
- [ ] **Flash-loan-manipulable collateral**: flag DeFi protocols that accept collateral valued by an on-chain spot price that can be manipulated within a single transaction -- flash loan attack inflates collateral value, borrows against it, and repays the flash loan

### Gas Optimization and DoS
<!-- activation: keywords=["gas", "loop", "array", "storage", "sload", "sstore", "mapping", "push", "length", "delete", "iteration", "DoS", "block.gaslimit"] -->

- [ ] **Unbounded loop over storage array**: flag loops iterating over a storage array (e.g., all token holders, all stakers) with no upper bound -- as the array grows, the function eventually exceeds the block gas limit and becomes uncallable (permanent DoS)
- [ ] **Storage in loop body**: flag loops that read or write storage variables (`SLOAD`/`SSTORE`) on every iteration -- cache storage values in memory before the loop; each SLOAD costs 2100 gas (cold) or 100 gas (warm)
- [ ] **Push without pop**: flag arrays that grow via `.push()` but never shrink -- if iterated, this is a DoS vector; if not iterated, it wastes storage gas
- [ ] **External call in loop**: flag loops that make external calls to untrusted addresses on each iteration -- a single reverting call DoSes the entire loop (e.g., iterating over payees where one rejects Ether)

### Upgradeable Proxy and Storage Layout
<!-- activation: keywords=["proxy", "upgrade", "delegatecall", "implementation", "storage", "gap", "ERC1967", "UUPS", "transparent", "beacon", "initializer", "initialize", "ERC-7201"] -->

- [ ] **Storage collision**: flag upgradeable proxy contracts where the new implementation adds state variables in a position that overlaps with existing storage layout -- storage slots are determined by declaration order; inserting a variable shifts all subsequent slots, corrupting data
- [ ] **Missing storage gap**: flag base contracts in an upgradeable hierarchy that do not reserve storage slots (`uint256[50] private __gap`) or use ERC-7201 namespaced storage -- adding state variables to the base contract in a future upgrade collides with the derived contract's storage
- [ ] **Missing initializer**: flag upgradeable contracts that use constructors instead of `initializer` functions -- proxy contracts do not execute the implementation's constructor; state set in the constructor exists only in the implementation, not the proxy
- [ ] **selfdestruct in upgradeable contract**: flag `selfdestruct` in a contract behind a proxy -- destroying the implementation bricks all proxies pointing to it
- [ ] **delegatecall to user-supplied address**: flag `delegatecall` where the target address is user-controlled -- the attacker's code executes in the caller's storage context, enabling arbitrary state manipulation

### Front-Running and MEV
<!-- activation: keywords=["front-run", "MEV", "mempool", "commit-reveal", "deadline", "slippage", "sandwich", "timestamp", "block.timestamp", "block.number", "flashbots"] -->

- [ ] **Commit-reveal not used**: flag on-chain actions where the outcome depends on user-submitted values (auction bids, votes, random seeds) that are visible in the mempool before confirmation -- use a commit-reveal scheme to prevent front-running
- [ ] **No slippage protection**: flag DEX swap or liquidity operations without a minimum output amount (slippage tolerance) -- a sandwich attacker can front-run and back-run the transaction, extracting value
- [ ] **block.timestamp as randomness**: flag `block.timestamp` or `block.number` used as a source of randomness -- miners/validators can influence these values; use Chainlink VRF or commit-reveal for randomness
- [ ] **Missing deadline on swap**: flag swap transactions without an expiration timestamp -- a delayed transaction can be executed at an unfavorable price long after submission

## Common False Positives

- **Trusted internal calls**: calls between contracts within the same protocol that are deployed together and not upgradeable separately are lower reentrancy risk. Still verify the call order follows checks-effects-interactions.
- **Solidity >=0.8 arithmetic**: Solidity 0.8+ has built-in overflow checks. Do not flag arithmetic as unsafe unless it is inside an `unchecked` block.
- **Administrative functions behind multisig**: functions restricted to a multisig or DAO governance have reduced centralization risk. Verify the access control mechanism before flagging centralization.
- **Known-length arrays**: arrays with a compile-time or deploy-time known maximum length (e.g., 10 supported tokens) are safe to iterate. Flag only truly unbounded arrays.

## Severity Guidance

| Finding | Severity |
|---|---|
| Reentrancy -- external call before state update on value path | Critical |
| delegatecall to user-supplied address | Critical |
| Missing access control on fund withdrawal or parameter change | Critical |
| Single-source spot price oracle (flash-loan manipulable) | Critical |
| tx.origin for authentication | Critical |
| Unchecked low-level call return value on value transfer | Important |
| Integer overflow in Solidity <0.8 without SafeMath | Important |
| Storage collision in upgradeable proxy | Important |
| Unbounded loop over storage array (DoS risk) | Important |
| No slippage protection on swap | Important |
| Missing event for state change | Minor |
| block.timestamp as randomness source | Minor |
| Storage read in loop body (gas inefficiency) | Minor |

## See Also

- `lang-solidity` -- language-level Solidity idioms and compiler-version-specific pitfalls
- `sec-owasp-a01-broken-access-control` -- missing access control on smart contract functions parallels web access control failures
- `footgun-integer-overflow-sign-extension` -- integer overflow is especially dangerous in financial smart contracts
- `conc-race-conditions-data-races` -- front-running is a transaction-ordering race condition in the mempool

## Authoritative References

- [SWC Registry, "Smart Contract Weakness Classification"](https://swcregistry.io/)
- [OpenZeppelin, "Security Audits" and "Contracts Documentation"](https://docs.openzeppelin.com/contracts/)
- [Consensys, "Smart Contract Best Practices"](https://consensys.github.io/smart-contract-best-practices/)
- [Trail of Bits, "Building Secure Smart Contracts"](https://github.com/crytic/building-secure-contracts)
- [samczsun, "Taking undercollateralized loans for fun and for profit" (2019)](https://samczsun.com/taking-undercollateralized-loans-for-fun-and-for-profit/)
