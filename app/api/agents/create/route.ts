import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { AgentSpec } from "@/lib/agents/spec";
import { createAgentWallet, fundWallet } from "@/lib/thirdweb/wallet";

const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, price, instructions } = body;

        // 1. Generate Wallet
        const privateKey = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

        // Derive address
        // We need to import client and privateKeyToAccount
        const { client, fundWallet } = await import("@/lib/thirdweb/wallet");
        const { privateKeyToAccount } = await import("thirdweb/wallets");

        const account = privateKeyToAccount({
            client,
            privateKey,
        });

        const id = uuidv4();

        // Simple Heuristics for MVP (Real app would use an LLM or Planner)
        let steps: any[] = [{ type: "llm.generate", input: { prompt: instructions } }];

        const lowerInstr = (instructions || "").toLowerCase();

        if (lowerInstr.includes("price of bitcoin") || lowerInstr.includes("bitcoin price")) {
            steps = [
                {
                    type: "coinbase.getPrice",
                    input: { pair: "BTC-USD" }
                }
            ];
        } else if (lowerInstr.includes("mon") && (lowerInstr.includes("price") || lowerInstr.includes("usd"))) {
            steps = [
                {
                    type: "coinbase.getPrice",
                    input: { pair: "MON-USD" }
                }
            ];
        }

        const newAgent: AgentSpec = {
            id,
            name: name || "Untitled Agent",
            description: description || "",
            wallet: {
                address: account.address,
                encryptedKey: privateKey,
            },
            pricing: {
                enabled: true,
                token: "MON",
                amount: Number(price) || 0.001,
            },
            logic: {
                steps
            },
            tools: ["http.get", "coinbase.getPrice"]
        };

        // Write to file
        if (!fs.existsSync(AGENTS_DIR)) fs.mkdirSync(AGENTS_DIR, { recursive: true });
        fs.writeFileSync(path.join(AGENTS_DIR, `${id}.json`), JSON.stringify(newAgent, null, 2));

        // Fund Wallet (fire and forget to avoid blocking UI too long, or await if fast)
        try {
            await fundWallet(newAgent.wallet.address, "0.01");
        } catch (err) {
            console.warn("Failed to fund wallet (Master key might be missing):", err);
        }


        return NextResponse.json({ success: true, agent: newAgent });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
