# Build-Your-Own-Agent 🚀

**Autonomous Onchain Agents Platform** built for Monad Testnet using Thirdweb and x402 Protocol.

A hackathon project that enables users to create, deploy, and run autonomous agents that can interact with web APIs, make payments, and execute complex workflows on-chain.

## 🌟 Features

### Agent Builder
- **Custom Agent Creation**: Build your own autonomous agents with natural language instructions
- **Automatic Wallet Generation**: Each agent gets its own wallet on Monad Testnet
- **Tool Selection**: Agents can use various tools like HTTP requests, GitHub API, Coinbase API, and more
- **Pricing Configuration**: Set up pay-per-use pricing for your agents

### Pre-built Agents

#### 🤖 Open Source Crypto Funder
Automatically scans GitHub repositories and funds projects that accept cryptocurrency on Monad Testnet. Uses GitHub API to find crypto-friendly projects and sends MON tokens.

#### ✈️ Flight Search Assistant
Finds the best flight deals using the Amadeus API. Search flights by origin, destination, and departure date.

#### 🛒 Auto Item Buyer Agent
Automatically purchases items from the game store using MON via x402 payments. Handles the entire payment flow automatically.

#### 💻 GitHub Support Finder
Searches GitHub for open issues with "support" or "help wanted" labels to help developers find projects needing assistance.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (React)
- **Blockchain**: Monad Testnet
- **Web3**: Thirdweb SDK
- **Payment Protocol**: x402 (HTTP 402 Payment Required)
- **APIs**: GitHub API, Coinbase API, Amadeus API
- **Styling**: Tailwind CSS

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- A wallet with Monad Testnet MON tokens (for funding agents)

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/Tru3Nrg/agentic-payments-hack.git
cd agentic-payments-hack

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
# Thirdweb Configuration
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_thirdweb_client_id
THIRDWEB_PROJECT_ID=your_project_id

# Master Wallet (for funding agent wallets)
MASTER_PRIVATE_KEY=your_private_key

# API Keys (optional, for specific features)
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
COINBASE_API_KEY=your_coinbase_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 How It Works

### Agent Architecture

Each agent consists of:
- **Wallet**: Unique Ethereum address on Monad Testnet
- **Tools**: Set of available actions (HTTP, GitHub, Coinbase, etc.)
- **Logic**: Step-by-step execution plan
- **Pricing**: Optional pay-per-use configuration

### Agent Execution Flow

1. User connects wallet and selects/creates an agent
2. Agent executes its logic steps sequentially
3. Each step can call tools (APIs, blockchain operations, etc.)
4. Results are displayed in real-time
5. For x402-protected APIs, agents automatically handle payment flow

### x402 Payment Integration

The platform implements the x402 protocol for pay-per-use APIs:
- Agents detect HTTP 402 responses
- Extract payment requirements from headers
- Execute on-chain payments
- Retry API calls with payment proof

## 📁 Project Structure

```
agentic-payments-hack/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── agents/        # Agent management endpoints
│   ├── agents/            # Agent pages
│   └── page.tsx           # Home page
├── components/             # React components
│   ├── AgentBuilder.tsx   # Agent creation UI
│   ├── AgentConsole.tsx  # Agent execution console
│   └── ...                # Other components
├── lib/
│   ├── agents/            # Agent runtime and tools
│   ├── thirdweb/          # Thirdweb wallet utilities
│   ├── x402/              # x402 payment protocol
│   └── store/              # Game store logic
├── data/
│   ├── agents/            # Agent definitions (JSON)
│   └── purchases/         # Purchase records
└── scripts/               # Utility scripts
```

## 🎮 Available Tools

Agents can use the following tools:

- `http.get` - Make HTTP GET requests
- `github.searchRepositories` - Search GitHub repositories
- `github.searchUsers` - Search GitHub users
- `github.searchIssues` - Search GitHub issues
- `github.fetchReadme` - Fetch repository README
- `github.detectCryptoFunding` - Detect crypto funding support
- `coinbase.getPrice` - Get cryptocurrency prices
- `amadeus.searchFlights` - Search for flights
- `wallet.fundProjects` - Send funds to projects
- `store.listItems` - List game store items
- `store.purchaseItem` - Purchase items via x402
- `x402.call` - Make x402-protected API calls

## 🔐 Security Notes

- **Test Keys Only**: The `data/agents/` directory contains test private keys for hackathon purposes only
- **Environment Variables**: Never commit `.env.local` or any files containing real API keys
- **Production**: For production use, implement proper key management (AWS KMS, Smart Accounts, etc.)

## 🚀 Vercel Deployment

### Setting Up Redis Storage for Persistent Agent Data

The application uses Redis for persistent agent storage in production. You can use either **Upstash Redis** (recommended) or **Vercel KV**.

#### Option 1: Upstash Redis (Recommended) ⭐

1. **Add Upstash Redis from Vercel Marketplace:**
   - Go to your Vercel project dashboard
   - Navigate to the "Storage" tab
   - Click "Browse Marketplace" or "Add Integration"
   - Search for "Upstash" and select "Upstash Redis"
   - Follow the setup wizard to create a Redis database

2. **Environment Variables:**
   Upstash automatically provides these environment variables:
   - `UPSTASH_REDIS_REST_URL` - Automatically set by Vercel
   - `UPSTASH_REDIS_REST_TOKEN` - Automatically set by Vercel

3. **Redeploy:**
   After adding Upstash Redis, redeploy your application. The storage layer will automatically detect and use Upstash Redis.

#### Option 2: Vercel KV (if available)

1. **Create a Vercel KV Database:**
   - Go to your Vercel project dashboard
   - Navigate to the "Storage" tab
   - Click "Create Database" and select "KV" (if available)
   - Follow the setup wizard

2. **Environment Variables:**
   Vercel KV automatically provides:
   - `KV_REST_API_URL` - Automatically set by Vercel
   - `KV_REST_API_TOKEN` - Automatically set by Vercel

**Note:** The code automatically detects which Redis provider is configured and uses it. For local development, the app falls back to filesystem storage. In production on Vercel, it uses Redis for persistence across serverless function invocations.

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Utilities
npm run list-wallets     # List all agent wallets
npm run check-mon-price  # Check MON token price
```

## 🤝 Contributing

This is a hackathon project. Feel free to fork, experiment, and build upon it!

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monad** - For the testnet infrastructure
- **Thirdweb** - For the Web3 SDK
- **x402 Protocol** - For the payment standard
- **Amadeus** - For the flight search API

---

Built with ❤️ for the Monad x Thirdweb x x402 Hackathon

