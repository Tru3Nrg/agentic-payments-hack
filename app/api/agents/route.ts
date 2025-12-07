import { NextResponse } from "next/server";
import { listAgents } from "@/lib/storage/agents";

export async function GET() {
    try {
        const agents = await listAgents();

        // Sort by name for better UX
        agents.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ agents });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to list agents" },
            { status: 500 }
        );
    }
}

