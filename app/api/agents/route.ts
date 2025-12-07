import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AgentSpec } from "@/lib/agents/spec";

const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

export async function GET() {
    try {
        if (!fs.existsSync(AGENTS_DIR)) {
            return NextResponse.json({ agents: [] });
        }

        const files = fs.readdirSync(AGENTS_DIR);
        const agents: AgentSpec[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                try {
                    const filePath = path.join(AGENTS_DIR, file);
                    const content = fs.readFileSync(filePath, "utf-8");
                    const agent: AgentSpec = JSON.parse(content);
                    agents.push(agent);
                } catch (err) {
                    console.error(`Error reading agent file ${file}:`, err);
                }
            }
        }

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

