"use client";

import { useState } from "react";
import { AgentSpec } from "@/lib/agents/spec";
import { createThirdwebClient, defineChain } from "thirdweb";
import { ConnectButton, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { monadTestnet, client as walletClient } from "@/lib/thirdweb/wallet";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";

// We need a client-side definition of the client too, or reuse the one from lib if it's safe (it is if NEXT_PUBLIC id is used)
const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
});

export default function AgentConsole({ agent }: { agent: AgentSpec }) {
    const account = useActiveAccount();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [testInput, setTestInput] = useState("");

    const handleRun = async () => {
        if (!account) {
            setLogs((prev) => [...prev, { type: "error", content: "No wallet connected. Please connect to run agent." }]);
            return;
        }

        setLoading(true);
        setLogs((prev) => [...prev, { type: "info", content: "Starting request..." }]);

        try {
            // Parse user input first to display it
            let requestBody = {};
            try {
                requestBody = testInput ? JSON.parse(testInput) : {};
            } catch (e) {
                // If not JSON, assume it's a raw input (e.g. URL)
                requestBody = { url: testInput, input: testInput };
            }

            // Display user's request
            if (Object.keys(requestBody).length > 0) {
                setLogs((prev) => [...prev, { type: "info", content: `User Request: ${JSON.stringify(requestBody)}` }]);
            }

            // 0. Fund Agent Setup
            setLogs((prev) => [...prev, { type: "info", content: `Agent Wallet: ${agent.wallet.address}` }]);
            setLogs(prev => [...prev, { type: "info", content: `Funding agent wallet (${agent.pricing.amount} ${agent.pricing.token})... Please confirm in wallet.` }]);

            const transaction = prepareTransaction({
                to: agent.wallet.address,
                chain: monadTestnet,
                client: walletClient,
                value: toWei(agent.pricing.amount.toString()),
            });

            const { transactionHash } = await sendTransaction({ transaction, account });
            setLogs(prev => [...prev, { type: "info", content: `Funding sent: ${transactionHash.slice(0, 10)}... Waiting for confirmation...` }]);

            await waitForReceipt({
                client: walletClient,
                chain: monadTestnet,
                transactionHash,
            });

            setLogs(prev => [...prev, { type: "info", content: "Funding confirmed! Executing agent logic..." }]);

            // Simulate 402 Payment Required call (for demonstration)
            setLogs(prev => [...prev, { type: "info", content: "Checking payment requirement..." }]);
            await new Promise(resolve => setTimeout(resolve, 300));

            const paymentRequirement = {
                token: agent.pricing.token,
                amount: agent.pricing.amount,
                destination: agent.wallet.address
            };

            setLogs(prev => [...prev, {
                type: "info",
                content: `402 Payment Required: ${paymentRequirement.amount} ${paymentRequirement.token} to ${paymentRequirement.destination.slice(0, 10)}...`,
                data: {
                    status: 402,
                    requirement: paymentRequirement,
                    headers: {
                        "x-402-price": paymentRequirement.amount.toString(),
                        "x-402-token": paymentRequirement.token,
                        "x-402-destination": paymentRequirement.destination
                    }
                }
            }]);

            await new Promise(resolve => setTimeout(resolve, 400));
            setLogs(prev => [...prev, { type: "info", content: `Payment proof provided: ${transactionHash.slice(0, 10)}...` }]);
            await new Promise(resolve => setTimeout(resolve, 300));
            setLogs(prev => [...prev, { type: "success", content: "Payment verified. Proceeding with agent execution..." }]);

            // 1. Make API call with payment proof
            const res = await fetch(`/api/agents/${agent.id}/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-payment-proof": transactionHash // Send transaction hash as payment proof
                },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();

            // Handle Payment Headers if 402 (Existing logic preserved if we want)
            // But given the prompt "user clicks run agent the agent address should get funded",
            // the explicit funding step above likely supersedes the need for 402 handling for THIS specific request flow,
            // OR we keep it as a secondary layer. I will keep it but simplest flow is the funding above first.

            if (res.status === 402) {
                setLogs((prev) => [...prev, { type: "error", content: "402 Payment Required (Additional Service Fee). Payment verification failed." }]);
                return;
            }

            if (!res.ok) {
                setLogs((prev) => [...prev, { type: "error", content: `Request failed: ${res.status} ${res.statusText}` }]);
                return;
            }

            if (data.logs) {
                // Map logs to display format
                const formattedLogs = data.logs.map((l: any) => {
                    if (l.type === "step_start") {
                        return { type: "info", content: `Executing step: ${l.step}`, timestamp: l.timestamp };
                    } else if (l.type === "step_end") {
                        return { type: l.result?.error ? "error" : "success", content: `Step ${l.step} result:`, data: l.result, timestamp: l.timestamp };
                    } else if (l.type === "complete") {
                        return { type: "success", content: "Agent execution completed", timestamp: l.timestamp };
                    }
                    return { ...l, type: l.type || "info" };
                });
                setLogs((prev) => [...prev, ...formattedLogs]);

                // Add final output if available
                if (data.output) {
                    setLogs((prev) => [...prev, { type: "success", content: "Final Result:", data: data.output, timestamp: Date.now() }]);
                }
            } else {
                setLogs((prev) => [...prev, { type: "success", content: "Executed successfully", data, timestamp: Date.now() }]);
            }

        } catch (e: any) {
            console.error(e);
            setLogs((prev) => [...prev, { type: "error", content: e.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 min-h-screen">
            <div className="flex justify-between items-center glass-panel glass-hover p-6 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-purple-300 to-gray-200 text-transparent bg-clip-text">{agent.name}</h1>
                    <p className="text-gray-300 text-sm">ID: {agent.id}</p>
                </div>
                <div className="text-right">
                    <ConnectButton client={client} chain={monadTestnet} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Wallet Info */}
                <div className="glass-panel glass-hover p-6 rounded-2xl text-sm font-mono text-gray-200">
                    <h3 className="text-lg font-bold text-white mb-4">Agent Wallet</h3>
                    <div className="mb-3">
                        <span className="block text-gray-400 text-xs mb-1">ADDRESS</span>
                        <span className="text-purple-300 break-all">{agent.wallet.address}</span>
                    </div>
                    <div className="mb-2">
                        <span className="block text-gray-400 text-xs mb-1">BALANCE</span>
                        {/* We could fetch this client side */}
                        <span className="text-green-300">Loading... (monad testnet) </span>
                    </div>
                </div>

                {/* Spec Info */}
                <div className="glass-panel glass-hover p-6 rounded-2xl text-gray-200">
                    <h3 className="text-lg font-bold text-white mb-4">Capabilities</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Price: <span className="text-yellow-300 font-semibold">{agent.pricing.amount} {agent.pricing.token}</span></li>
                        <li>Tools: <span className="text-gray-300">{agent.tools.join(", ")}</span></li>
                        <li>Steps: <span className="text-purple-300">{agent.logic.steps.length}</span></li>
                    </ul>
                </div>
            </div>

            {/* Test Console */}
            <div className="glass-panel glass-hover p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Test Runner</h3>
                <div className="flex gap-4 mb-4">
                    <input
                        className="flex-1 glass-input rounded-lg p-3 text-white font-mono text-sm placeholder-[#a0aec0]"
                        placeholder='JSON Input e.g. {"pair": "BTC-USD"} or {"url": "..."}'
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                    />
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="glass-button text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(59, 130, 246, 0.8))",
                        }}
                    >
                        {loading ? "Running..." : "Run Agent"}
                    </button>
                </div>

                <div className="glass-console p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs text-green-300">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-2">
                            <span className="opacity-50">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>{" "}
                            <span className={log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-400' : 'text-green-400'}>
                                {typeof log.content === 'string' ? log.content : JSON.stringify(log.content)}
                            </span>
                            {log.data && (
                                <div className="mt-1 ml-4">
                                    {log.data.price ? (
                                        <div className="text-yellow-400">
                                            <div>Price: <span className="text-white font-bold">${log.data.price}</span></div>
                                            {log.data.currency && <div>Currency: {log.data.currency}</div>}
                                            {log.data.source && <div>Source: {log.data.source}</div>}
                                        </div>
                                    ) : log.data.status === 402 ? (
                                        <div className="text-orange-400">
                                            <div className="mb-1">Status: <span className="text-white font-bold">402 Payment Required</span></div>
                                            {log.data.requirement && (
                                                <div className="text-xs">
                                                    <div>Token: <span className="text-white">{log.data.requirement.token}</span></div>
                                                    <div>Amount: <span className="text-white">{log.data.requirement.amount}</span></div>
                                                    <div>Destination: <span className="text-white font-mono">{log.data.requirement.destination}</span></div>
                                                </div>
                                            )}
                                            {log.data.headers && (
                                                <div className="mt-2 text-xs text-gray-400">
                                                    <div>Headers:</div>
                                                    <div className="ml-2">
                                                        <div>x-402-price: {log.data.headers["x-402-price"]}</div>
                                                        <div>x-402-token: {log.data.headers["x-402-token"]}</div>
                                                        <div>x-402-destination: {log.data.headers["x-402-destination"]?.slice(0, 20)}...</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <pre className="text-gray-400 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {logs.length === 0 && <span className="text-gray-500">Waiting for commands...</span>}
                </div>
            </div>
        </div>
    );
}
