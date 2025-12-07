import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/runtime";
import { getOrCreateAgent } from "@/lib/agents/server";

const TEMPLATE_ID = "github-support-agent";

export async function POST(req: NextRequest) {
    try {
        const agent = await getOrCreateAgent(TEMPLATE_ID);
        // Allow passing query via body
        const body = await req.json().catch(() => ({}));
        const input = {
            ...body
        };

        const result = await runAgent(agent, input);
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
