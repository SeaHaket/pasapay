# PasaPay — Global Cross-Border Remittance & Savings

PasaPay is a fast, low-cost remittance and savings MiniApp built exclusively for the **Opera MiniPay** ecosystem on the Celo blockchain.

It allows users across Southeast Asia, India, Latin America, and Africa to send stablecoins (USDT, USDC, USDm) instantly, cash out directly to local banks, e-wallets, or mobile money — and now earn yield on their savings via Aave v3.

---

## The Money Flow (Use Case)

PasaPay is designed for global workers and maritime employees (seafarers) who receive salaries via payroll cards like **Brightwell**, **Shipmoney**, or standard bank accounts.

1. **Salary Deposit:** Instead of suffering high fees and slow SWIFT transfers, a worker links their MiniPay USD Account to their employer or payroll card. On payday, their salary is deposited directly via ACH into MiniPay as stablecoins (USDC/USDT).
2. **Smart Allocation:** The worker opens PasaPay and uses the **Allocator** to batch-send to multiple family members at once — each with a saved name, route, and default amount.
3. **Local Cash-out:** Recipients receive funds instantly via their local crypto provider (e.g. Coins.ph), Fonbnk (African mobile money), or Transak.
4. **Savings Vault:** Funds not sent immediately earn yield in the **Savings Vault** — deposited into Aave v3 on Celo, auto-compounding at market rates with no lock-up.

**The PasaPay Advantage:** Traditional rails take days and charge massive hidden fees through poor FX spreads. With PasaPay, the FX spread is virtually zero — users see the exact USD-to-local-fiat rate, money arrives in seconds, and idle funds work for them.

---

## Key Features

- **Zero-Click Connect** — Seamlessly integrates with the MiniPay wallet interface natively, no wallet-connect prompts.
- **Smart Allocator** — Save groups of recipients (family, team) with names and default amounts. Batch-send to all of them in one confirmation flow. Supports MiniPay (on-chain), Fonbnk (mobile money), and exchange routes.
- **Savings Vault** — Deposit USDT or USDC into Aave v3 on Celo. Yield accrues every block. Withdraw anytime with no lock-up or penalty.
- **Dynamic Routing** — Available cash-out options adjust automatically based on the recipient's country (Fonbnk, Local Crypto Exchanges, Transak).
- **Live Exchange Rates** — Real-time integration with CoinGecko and Frankfurter APIs for accurate fiat-to-USD conversions.
- **Gas Abstraction** — Powered by Celo's CIP-64, all fees (including Aave interactions) are paid in stablecoins. No native CELO required.
- **Web2.5 UX** — Strictly optimized for non-technical users. No crypto jargon, no raw addresses shown, no gas prompts.

---

## Supported Offramp Routes

| Route | Coverage | Description |
|-------|----------|-------------|
| MiniPay | Global | Direct on-chain transfer to another MiniPay wallet |
| Fonbnk | 9 African countries (NG, KE, GH, ZA, UG, TZ, RW, SN, CM) | Cash out to mobile money (M-Pesa, OPay, MTN, etc.) |
| Local Crypto | PH, and others | Bridge to BSC USDT, then to local exchange (Coins.ph, Tokocrypto, etc.) |
| Transak | Global | Bank / e-wallet withdrawal (coming soon) |

---

## Savings Vault

The vault deposits user funds into **Aave v3 on Celo Mainnet**. Supported assets: USDT and USDC.

| Contract | Address |
|----------|---------|
| Aave v3 Pool | `0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402` |
| aUSDT | `0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df` |
| aUSDC | `0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785` |

Deposit flow: `approve(Pool, amount)` → `supply(asset, amount, user, 0)`. Withdraw: `withdraw(asset, amount, user)`. Passing `MaxUint256` as amount withdraws the full balance.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Vanilla CSS — mobile-first, 430px max-width |
| Web3 | viem, Celo, BSC |
| DeFi | Aave v3 on Celo |
| Localization | next-intl (English + Filipino) |
| Offramp | LI.fi SDK, Fonbnk, Transak |
| Phone resolution | SocialConnect / ODIS (Celo) |

---

## Project Structure

```
app/
  [locale]/
    page.tsx              — Home (balance, quick send, recent activity)
    send/page.tsx         — Send flow (amount → route → recipient → review)
    allocator/
      page.tsx            — Allocator groups list
      [groupId]/
        page.tsx          — Create / edit a group
        send/page.tsx     — Batch send to a group
    vault/page.tsx        — Savings Vault (deposit / withdraw via Aave)
    history/page.tsx      — Transaction history
    settings/page.tsx     — Settings, support, legal

lib/
  allocator.ts            — Group data model + localStorage CRUD
  vault.ts                — Aave v3 ABIs, encode helpers, read functions
  constants.ts            — Token addresses, fee currency adapters, chain IDs
  history.ts              — Transaction history storage
  fonbnk.ts               — Fonbnk offramp redirect
  lifi.ts                 — LI.fi bridge quote + execution

config/
  countries.ts            — Supported countries + offramp routes per country

hooks/
  useMiniPay.ts           — MiniPay wallet connection, balances, sendTransaction
  useExchangeRate.ts      — Live fiat exchange rates
```

---

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** Full functionality requires the Opera MiniPay mobile browser. For UI preview in a desktop browser, tap "Developer: Preview UI in Browser" on the landing screen.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_PASAPAY_FEE_ADDRESS` | Treasury wallet to re-enable Fonbnk app fees | disabled (unset) |

> **Fees are currently disabled.** Setting `NEXT_PUBLIC_PASAPAY_FEE_ADDRESS` to a valid `0x` address re-enables the $0.10 per-Fonbnk-transaction fee. Leaving it unset (the current default) charges no fee — both the collection logic and the fee line in the review screen are suppressed automatically.

---

## MiniPay Compliance

- All transactions use CIP-64 fee abstraction (stablecoin gas, no native CELO required)
- Supported tokens: USDT, USDC, USDm only
- Max viewport: 430px
- No external wallet prompts
- Privacy Policy and Terms of Service included
- Support link present (MiniPay listing requirement)
