"use client";

import { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client, monadTestnet } from "@/lib/thirdweb/wallet";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";

export default function AgentRunner() {
    const account = useActiveAccount();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState("open-source-crypto-funder");

    const agents = [
        { id: "open-source-crypto-funder", name: "Open Source Crypto Funder" },
        { id: "github-support-agent", name: "GitHub Support Finder" },
        { id: "flight-search-agent", name: "Flight Search Assistant" }
    ];

    const handleRun = async () => {
        if (!account) {
            setLogs([{ type: "error", content: "Please connect your wallet first." }]);
            return;
        }

        setLoading(true);
        setLogs([{ type: "info", content: `Initializing ${selectedAgent}...` }]);

        try {
            // 1. Get Agent Address
            const initRes = await fetch(`/api/agents/${selectedAgent}/address`);
            const initData = await initRes.json();

            if (initData.error) throw new Error(initData.error);
            const agentAddress = initData.address;

            setLogs(prev => [...prev, { type: "info", content: `Agent Wallet: ${agentAddress}` }]);

            // 2. Fund Agent
            setLogs(prev => [...prev, { type: "info", content: "Funding agent wallet (0.0001 MON)... Please confirm in wallet." }]);

            const transaction = prepareTransaction({
                to: agentAddress,
                chain: monadTestnet,
                client,
                value: toWei("0.0001"),
            });

            const { transactionHash } = await sendTransaction({ transaction, account });

            setLogs(prev => [...prev, { type: "info", content: `Funding sent: ${transactionHash.slice(0, 10)}... Waiting for confirmation...` }]);

            await waitForReceipt({
                client,
                chain: monadTestnet,
                transactionHash,
            });

            setLogs(prev => [...prev, { type: "info", content: "Funding confirmed! Starting execution..." }]);

            // 3. Run Agent
            const res = await fetch(`/api/agents/${selectedAgent}/run`, {
                method: "POST"
            });
            const data = await res.json();

            if (data.logs) {
                // Merge logs but keep visible history if possible, or just replace?
                // The current UI just shows `logs`. Let's append new logs.
                // Actually the API returns ALL logs from the run.
                // We should append them to our setup logs.
                setLogs(prev => [...prev, ...data.logs]);
            } else {
                console.log(data);
                setLogs(prev => [...prev, { type: "info", content: "Done (See console for details)" }]);
            }
        } catch (e: any) {
            console.error(e);
            setLogs(prev => [...prev, { type: "error", content: e.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel glass-hover rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="font-mono text-xs text-purple-300 mb-2 opacity-80">TEMPLATE AGENT</div>
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="glass-input text-white text-xl font-bold rounded-lg p-2 focus:outline-none"
                    >
                        {agents.map(a => (
                            <option key={a.id} value={a.id} className="bg-gray-900">{a.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <ConnectButton client={client} chain={monadTestnet} />
                </div>
            </div>

            <button
                onClick={handleRun}
                disabled={loading}
                className="w-full glass-button text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                style={{
                    background: "linear-gradient(135deg, rgba(147, 51, 234, 0.8), rgba(168, 85, 247, 0.8))",
                }}
            >
                {loading ? "Running Agent..." : "Run Agent"}
            </button>

            <div className="glass-console p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs text-green-300">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="opacity-50">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>{" "}
                        <span className={log.type === 'error' ? 'text-red-500' : ''}>
                            {log.step ? `[${log.step}] ` : ""}

                            {/* Generic Logs Output */}
                            {log.result?.users && (
                                <span className="text-pink-400">
                                    Found {log.result.users.length} sponsorable users:
                                    <ul className="pl-4 list-disc">
                                        {log.result.users.map((u: any, idx: number) => (
                                            <li key={idx}>
                                                <a href={u.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-pink-200">
                                                    {u.login}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </span>
                            )}

                            {log.result?.repos && (
                                <span className="text-purple-400">
                                    Found {log.result.repos.length} repositories:
                                    <ul className="pl-4 list-disc">
                                        {log.result.repos.map((r: any, idx: number) => (
                                            <li key={idx}>
                                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-200">
                                                    {r.name}
                                                </a> {r.stars > 0 && `(⭐ ${r.stars})`}
                                            </li>
                                        ))}
                                    </ul>
                                </span>
                            )}

                            {log.result?.issues && (
                                <span className="text-yellow-400">
                                    Found {log.result.issues.length} issues:
                                    <ul className="pl-4 list-disc">
                                        {log.result.issues.map((issue: any, idx: number) => (
                                            <li key={idx}>
                                                <a href={issue.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">
                                                    {issue.title}
                                                </a> ({issue.labels.join(", ")})
                                            </li>
                                        ))}
                                    </ul>
                                </span>
                            )}

                            {/* Legacy Funder Output */}
                            {log.result?.projectsToFund && (
                                <span className="text-yellow-400">
                                    Found {log.result.projectsToFund.length} targets: {log.result.projectsToFund.map((p: any) => p.repo).join(", ")}
                                </span>
                            )}
                            {log.result?.fundingResults && (
                                <span className="text-gray-300">
                                    Funded: {log.result.fundingResults.map((r: any) => `${r.repo} (${r.status})`).join(", ")}
                                </span>
                            )}

                            {/* Flight Search Output */}
                            {log.result?.flights && (
                                <span className="text-cyan-400">
                                    Found {log.result.flights.length} flights:
                                    <ul className="pl-4">
                                        {log.result.flights.map((f: any, idx: number) => (
                                            <li key={idx}>{f.airline}: {f.departure} &rarr; {f.arrival} ({f.price})</li>
                                        ))}
                                    </ul>
                                </span>
                            )}

                            {!log.result?.projectsToFund && !log.result?.fundingResults && !log.result?.issues && !log.result?.flights && (
                                typeof log.content === 'string' ? log.content : JSON.stringify(log.result || log)
                            )}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && <span className="text-gray-500">Select an agent and click Run...</span>}
            </div>
        </div>
    );
}
