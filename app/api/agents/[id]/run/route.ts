import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runAgent } from "@/lib/agents/runtime";
import { verifyPayment, x402Response } from "@/lib/x402/server";
import { AgentSpec } from "@/lib/agents/spec";

const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const agentPath = path.join(AGENTS_DIR, `${id}.json`);

    if (!fs.existsSync(agentPath)) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent: AgentSpec = JSON.parse(fs.readFileSync(agentPath, "utf-8"));

    // Check Payment
    const requirement = {
        token: agent.pricing.token,
        amount: agent.pricing.amount,
        destination: agent.wallet.address // The agent's wallet receives the funds
    };

    const isPaid = await verifyPayment(req, requirement);

    if (!isPaid) {
        return x402Response(requirement);
    }

    // Execute Agent
    try {
        const body = await req.json().catch(() => ({}));
        const result = await runAgent(agent, body);
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
