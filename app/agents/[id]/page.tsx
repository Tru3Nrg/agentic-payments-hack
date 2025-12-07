import fs from "fs";
import path from "path";
import AgentConsole from "@/components/AgentConsole";
import { AgentSpec } from "@/lib/agents/spec";

// This is a server component
export default function AgentPage({ params }: { params: { id: string } }) {
    const agentPath = path.join(process.cwd(), "data", "agents", `${params.id}.json`);

    if (!fs.existsSync(agentPath)) {
        return <div className="text-white p-10">Agent not found</div>;
    }

    const agent: AgentSpec = JSON.parse(fs.readFileSync(agentPath, "utf-8"));

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <AgentConsole agent={agent} />
        </div>
    );
}
