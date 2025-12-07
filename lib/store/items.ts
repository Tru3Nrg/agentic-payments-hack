import { AgentSpec } from "../agents/spec";

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;     // now MON, not USDC
    token: "MON";      // only MON
    image?: string;    // path to item image
    stock?: number;    // current stock count (added dynamically)
    isBundle?: boolean; // true if this is a bundle purchase
    bundleItems?: string[]; // item IDs included in bundle
}

export const STORE_ITEMS: StoreItem[] = [
    {
        id: "sword",
        name: "Sword of Monad",
        description: "A sharp virtual blade forged in Monad blockspace.",
        price: 0.0001,
        token: "MON",
        image: "/images/game-items/sword.png"
    },
    {
        id: "shield",
        name: "Shield of Gasless",
        description: "A sturdy shield crafted to defend against high gas foes.",
        price: 0.0001,
        token: "MON",
        image: "/images/game-items/shield.png"
    },
    {
        id: "bundle",
        name: "Sword & Shield Bundle",
        description: "Get both the Sword of Monad and Shield of Gasless together! 10% discount when purchased as a bundle.",
        price: 0.00018, // (0.0001 + 0.0001) * 0.9 = 0.00018
        token: "MON",
        image: undefined, // Bundle doesn't have a single image
        isBundle: true,
        bundleItems: ["sword", "shield"]
    }
];

// Helper to get bundle price (10% discount)
export function getBundlePrice(): number {
    const swordPrice = STORE_ITEMS.find(i => i.id === "sword")?.price || 0.0001;
    const shieldPrice = STORE_ITEMS.find(i => i.id === "shield")?.price || 0.0001;
    return (swordPrice + shieldPrice) * 0.9; // 10% discount
}

export interface PurchaseRecord {
    id: string;
    agentId: string;
    buyerAddress: string;
    itemId: string;
    itemName: string;
    amount: number;   // 0.0001 MON
    token: "MON";     // fixed
    paidAt: string;
    txHash?: string;
}

export const GAME_ITEM_STORE_AGENT: AgentSpec = {
    id: "game-item-store",
    name: "Game Item Store Agent",
    description: "Sells virtual Sword and Shield items using MON via 402-paywalled API on Monad testnet.",
    wallet: {
        address: "", // filled at bootstrap with thirdweb createAgentWallet()
    },
    // Pricing object is still required, but actual price is per-item.
    pricing: {
        enabled: true,
        token: "MON",   // now MON only
        amount: 0       // actual amount determined by item.price
    },
    tools: [
        "store.listItems",
        "store.getItemById",
        "store.recordPurchase"
    ],
    logic: {
        steps: [
            {
                type: "store.handleAction",
                input: {}
            }
        ]
    }
};

