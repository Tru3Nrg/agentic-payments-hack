import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAgent } from "@/lib/agents/server";
import { runAgent } from "@/lib/agents/runtime";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { itemId, buyerAddress } = body;

        if (!itemId) {
            return NextResponse.json({ error: "itemId is required" }, { status: 400 });
        }

        if (!buyerAddress) {
            return NextResponse.json({ error: "buyerAddress is required" }, { status: 400 });
        }

        // Get or create the agent
        const agent = await getOrCreateAgent("auto-item-buyer");

        // Run agent with purchase input
        const result = await runAgent(agent, {
            itemId,
            buyerAddress
        });

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

