import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAgent } from "@/lib/agents/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const agent = await getOrCreateAgent(id);
        return NextResponse.json({
            address: agent.wallet.address,
            agentId: agent.id
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

