import AgentConsole from "@/components/AgentConsole";
import { getAgent } from "@/lib/storage/agents";

// This is a server component
export default async function AgentPage({ params }: { params: { id: string } }) {
    const agent = await getAgent(params.id);

    if (!agent) {
        return <div className="text-white p-10">Agent not found</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <AgentConsole agent={agent} />
        </div>
    );
}
