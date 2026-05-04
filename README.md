# PasaPay - Global Cross-Border Platform 💸

PasaPay is a fast, seamless, and low-cost remittance MiniApp built exclusively for the **Opera MiniPay** ecosystem on the Celo blockchain. 

It allows users across Southeast Asia, India, Latin America, and Africa to send stablecoins (USDT, USDC, USDm) instantly and cash out directly to their local banks, e-wallets, or mobile money via trusted offramp providers.

## The Money Flow (Use Case)

PasaPay is designed to disrupt traditional remittance rails, particularly for global workers and maritime employees (seafarers) who receive salaries via payroll cards like **Brightwell**, **Shipmoney**, or standard bank accounts. 

1. **Salary Deposit:** Instead of suffering high fees and slow SWIFT transfers, a worker links their MiniPay USD Account to their employer or payroll card. On payday, their salary is deposited directly via ACH into MiniPay as stablecoins (USDC/USDT).
2. **Instant Remittance:** The worker opens the PasaPay MiniApp inside Opera MiniPay and sends a portion of their salary to their family back home.
3. **Local Cash-out:** The family receives the funds instantly via their local crypto provider (e.g. Coins.ph, Binance), Fonbnk (for African mobile money), or Transak.

**The PasaPay Advantage:** Traditional rails take days to settle and charge massive hidden fees through poor FX (foreign exchange) spreads. With PasaPay, the FX spread is virtually zero—users see the exact USD-to-Local-Fiat exchange rate on the blockchain, and the money arrives in seconds.

## Key Features

- **Zero-Click Connect**: Seamlessly integrates with the MiniPay wallet interface natively without clunky wallet-connect prompts.
- **Dynamic Routing**: Automatically adjusts available cash-out options based on the recipient's country (Transak, Fonbnk, Local Crypto Exchanges).
- **Live Exchange Rates**: Real-time integration with CoinGecko and Frankfurter APIs for accurate fiat-to-USD conversions.
- **Gas Abstraction**: Powered by Celo's CIP-64, users never have to worry about native gas tokens; fees are paid directly in stablecoins.
- **Web2.5 UX (Non-Crypto Native)**: The app is strictly optimized for normal, non-technical users. Crypto-jargon is entirely abstracted away (no "gas", "onramp", or "0x..." addresses required). PasaPay strictly adheres to all Opera MiniPay design and usability guidelines.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Vanilla CSS (Mobile-First, strict 480px constraint)
- **Web3**: viem, Celo, Arbitrum
- **Localization**: next-intl

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Note:** To fully test the application, it must be opened within the Opera MiniPay mobile browser or using a MiniPay user-agent simulator.
