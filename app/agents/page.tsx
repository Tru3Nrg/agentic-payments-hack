"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentSpec } from "@/lib/agents/spec";

export default function AgentsPage() {
    const [agents, setAgents] = useState<AgentSpec[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAgents() {
            try {
                const response = await fetch("/api/agents");
                if (!response.ok) {
                    throw new Error("Failed to fetch agents");
                }
                const data = await response.json();
                setAgents(data.agents || []);
            } catch (err: any) {
                setError(err.message || "Failed to load agents");
            } finally {
                setLoading(false);
            }
        }

        fetchAgents();
    }, []);

    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-6xl">
                <div className="text-center mb-10 glass-panel rounded-2xl p-8 glass-hover">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-gray-200 to-purple-300 text-transparent bg-clip-text">
                        All Agents
                    </h1>
                    <p className="text-xl text-gray-200">
                        View and manage all your agents
                    </p>
                </div>

                {loading && (
                    <div className="text-center text-gray-400 py-10">
                        Loading agents...
                    </div>
                )}

                {error && (
                    <div className="text-center text-red-400 py-10">
                        Error: {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {agents.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 glass-panel rounded-2xl">
                                <p className="text-xl mb-4">No agents found</p>
                                <Link
                                    href="/"
                                    className="text-purple-300 hover:text-purple-200 underline"
                                >
                                    Create your first agent
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {agents.map((agent) => (
                                    <Link
                                        key={agent.id}
                                        href={`/agents/${agent.id}`}
                                        className="glass-panel glass-hover rounded-2xl p-6 transition-all hover:scale-105"
                                    >
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {agent.name}
                                            </h3>
                                            {agent.description && (
                                                <p className="text-gray-400 text-sm line-clamp-2">
                                                    {agent.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Price:</span>
                                                <span className="text-purple-300 font-medium">
                                                    {agent.pricing.enabled
                                                        ? `${agent.pricing.amount} ${agent.pricing.token}`
                                                        : "Free"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mt-2">
                                                <span className="text-gray-400">Tools:</span>
                                                <span className="text-gray-300">
                                                    {agent.tools.length}
                                                </span>
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500 font-mono truncate">
                                                {agent.wallet.address}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}

                <div className="text-center mt-8">
                    <Link
                        href="/"
                        className="glass-button text-white font-bold py-3 px-6 rounded-lg transition-all inline-block"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

