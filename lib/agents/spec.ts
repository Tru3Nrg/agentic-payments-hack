export interface AgentSpec {
    id: string;
    name: string;
    description: string;

    wallet: {
        address: string;
        // For MVP, we might store the private key securely (e.g. encrypted or just localized for hackathon)
        // Ideally use Smart Accounts or AWS KMS, but for this hackathon:
        encryptedKey?: string;
    };

    pricing: {
        enabled: boolean;
        token: "USDC" | "MON";
        amount: number; // price per call
    };

    logic: {
        steps: Array<{
            type: string;
            input?: any;
        }>;
    };

    tools: string[];
}

// ------------------------------------------------------------------
// DATA & TEMPLATES
// ------------------------------------------------------------------

export const OSS_REPOS = [
    "bitcoin/bitcoin",
    "monadlabs/monad-node",
    "someuser/someproject"
];

export const FUNDING_REGISTRY: Record<string, string> = {
    // In real app, these would be real addresses
    "bitcoin/bitcoin": "0x7890...",
    "monadlabs/monad-node": "0x4567...",
    "someuser/someproject": "0x1234..." // Replace with real if testing
};

export const OPEN_SOURCE_CRYPTO_FUNDER: AgentSpec = {
    id: "open-source-crypto-funder",
    name: "Open Source Crypto Funder",
    description: "Scans curated GitHub repos for crypto-friendly projects and auto-funds them on Monad testnet.",

    wallet: {
        address: "", // to be filled in at bootstrap
    },

    pricing: {
        enabled: false,
        token: "USDC",
        amount: 0
    },

    tools: [
        "github.searchUsers",
        "github.searchRepositories",
        "wallet.fundProjects"
    ],

    logic: {
        steps: [
            {
                type: "github.searchUsers",
                input: {
                    query: "monad is:sponsorable"
                }
            },
            {
                type: "github.searchRepositories",
                input: {
                    query: "monad"
                }
            },
            {
                type: "github.searchUsers",
                input: {
                    query: "crypto is:sponsorable type:user"
                }
            }
        ]
    }
};

export const FLIGHT_SEARCH_AGENT: AgentSpec = {
    id: "flight-search-agent",
    name: "Flight Search Assistant",
    description: "Finds the best flight deals using Amadeus API.",

    wallet: {
        address: "", // to be filled in at bootstrap
    },

    pricing: {
        enabled: false,
        token: "USDC",
        amount: 0
    },

    tools: [
        "amadeus.searchFlights"
    ],

    logic: {
        steps: [
            {
                type: "amadeus.searchFlights",
                input: {
                    origin: "SFO",
                    destination: "JFK",
                    departureDate: "2025-12-25"
                }
            }
        ]
    }
};

export const GITHUB_SUPPORT_AGENT: AgentSpec = {
    id: "github-support-agent",
    name: "GitHub Support Finder",
    description: "Finds GitHub issues with 'support' or 'help wanted' labels for developers.",

    wallet: {
        address: "",
    },

    pricing: {
        enabled: false,
        token: "USDC",
        amount: 0
    },

    tools: [
        "github.searchIssues"
    ],

    logic: {
        steps: [
            {
                type: "github.searchIssues",
                input: {
                    query: "label:support label:\"help wanted\" state:open"
                }
            }
        ]
    }
};

// Re-export GAME_ITEM_STORE_AGENT from store/items
export { GAME_ITEM_STORE_AGENT } from "../store/items";

export const AUTO_ITEM_BUYER_AGENT: AgentSpec = {
    id: "auto-item-buyer",
    name: "Auto Item Buyer Agent",
    description: "Automatically purchases items from the game store using MON via x402 payments. Handles the full payment flow automatically.",
    wallet: {
        address: "", // filled at bootstrap with thirdweb createAgentWallet()
    },
    pricing: {
        enabled: false, // This agent doesn't charge - it buys items for the user
        token: "MON",
        amount: 0
    },
    tools: [
        "store.listItems",
        "store.getItemById",
        "store.purchaseItem"
    ],
    logic: {
        steps: [
            {
                type: "store.purchaseItem",
                input: {} // itemId and buyerAddress will come from runtime input
            }
        ]
    }
};
