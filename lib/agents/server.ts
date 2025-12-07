
import {
    OPEN_SOURCE_CRYPTO_FUNDER,
    GITHUB_SUPPORT_AGENT,
    FLIGHT_SEARCH_AGENT,
    GAME_ITEM_STORE_AGENT,
    AUTO_ITEM_BUYER_AGENT,
    AgentSpec
} from "./spec";
import { fundWallet } from "@/lib/thirdweb/wallet";
import { getAgent, saveAgent } from "@/lib/storage/agents";

function getTemplate(id: string): AgentSpec | null {
    switch (id) {
        case "open-source-crypto-funder": return OPEN_SOURCE_CRYPTO_FUNDER;
        case "github-support-agent": return GITHUB_SUPPORT_AGENT;
        case "flight-search-agent": return FLIGHT_SEARCH_AGENT;
        case "game-item-store": return GAME_ITEM_STORE_AGENT;
        case "auto-item-buyer": return AUTO_ITEM_BUYER_AGENT;
        default: return null;
    }
}

export async function getOrCreateAgent(agentId: string): Promise<AgentSpec> {
    // Return existing if found
    const existing = await getAgent(agentId);
    if (existing) {
        return existing;
    }

    // Create new
    const template = getTemplate(agentId);
    if (!template) {
        throw new Error(`Agent template with ID '${agentId}' not found.`);
    }

    // Generate Wallet
    const { createAgentWallet } = await import("@/lib/thirdweb/wallet");
    const { account, privateKey } = await createAgentWallet();

    const agent = {
        ...template,
        wallet: { address: account.address, encryptedKey: privateKey }
    };

    // Save agent (works in serverless environments)
    await saveAgent(agent);

    // Optional: Auto-fund initial amount from master wallet (can keep or remove based on new flow)
    // We will keep a small amount for gas or just log it.
    // The user requirement is "connected wallet will fund", so we might skip this or keep it as backup.
    // For now, let's COMMENT IT OUT to rely on user funding, or fund a tiny amount for gas.
    // Ideally, if the user funds it, we don't need this.
    // try {
    //     await fundWallet(agent.wallet.address, "0.01");
    // } catch (e) { console.error("Initial server funding failed", e); }

    return agent;
}
