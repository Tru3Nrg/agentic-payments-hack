import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/runtime";
import { getOrCreateAgent } from "@/lib/agents/server";

const TEMPLATE_ID = "open-source-crypto-funder";

export async function POST(req: NextRequest) {
    try {
        const agent = await getOrCreateAgent(TEMPLATE_ID);
        const result = await runAgent(agent, {});
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
