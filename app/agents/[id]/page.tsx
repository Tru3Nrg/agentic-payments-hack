import AgentConsole from "@/components/AgentConsole";
import { getAgent } from "@/lib/storage/agents";

// This is a server component
export default async function AgentPage({ params }: { params: { id: string } }) {
    const agent = await getAgent(params.id);
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

    if (!agent) {
        return (
            <div className="min-h-screen bg-black text-white p-10">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold mb-4">Agent not found</h1>
                    <p className="text-gray-400 mb-4">
                        Agent with ID <code className="bg-gray-800 px-2 py-1 rounded">{params.id}</code> could not be found.
                    </p>
                    {!hasKV && (
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mt-4">
                            <p className="text-yellow-200 font-semibold mb-2">⚠️ Storage Not Configured</p>
                            <p className="text-yellow-100 text-sm mb-2">
                                Vercel KV is not configured. Agents created without KV storage will not persist across serverless function invocations.
                            </p>
                            <p className="text-yellow-100 text-sm">
                                To fix this, set up Vercel KV in your project dashboard and redeploy.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <AgentConsole agent={agent} />
        </div>
    );
}
