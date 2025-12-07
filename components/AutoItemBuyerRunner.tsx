"use client";

import { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { STORE_ITEMS } from "@/lib/store/items";
import { monadTestnet, client as walletClient } from "@/lib/thirdweb/wallet";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
});

export default function AutoItemBuyerRunner() {
    const account = useActiveAccount();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState("sword");

    const handleRun = async () => {
        if (!account) {
            setLogs([{ type: "error", content: "Please connect your wallet first." }]);
            return;
        }

        setLoading(true);
        setLogs([{ type: "info", content: `Initializing Auto Item Buyer Agent...` }]);

        try {
            // 1. Get Agent Address
            const initRes = await fetch("/api/agents/auto-item-buyer/address");
            const initData = await initRes.json();

            if (initData.error) throw new Error(initData.error);
            const agentAddress = initData.address;

            setLogs(prev => [...prev, { type: "info", content: `Agent Wallet: ${agentAddress}` }]);
            setLogs(prev => [...prev, { type: "info", content: `Selected item: ${selectedItemId}` }]);
            setLogs(prev => [...prev, { type: "info", content: `Buyer address: ${account.address}` }]);

            // 2. Fund Agent Wallet with 0.01 MON
            setLogs(prev => [...prev, { type: "info", content: "Funding agent wallet (0.01 MON)... Please confirm in wallet." }]);

            const transaction = prepareTransaction({
                to: agentAddress,
                chain: monadTestnet,
                client: walletClient,
                value: toWei("0.01"),
            });

            const { transactionHash } = await sendTransaction({ transaction, account });

            setLogs(prev => [...prev, { type: "info", content: `Funding sent: ${transactionHash.slice(0, 10)}... Waiting for confirmation...` }]);

            await waitForReceipt({
                client: walletClient,
                chain: monadTestnet,
                transactionHash,
            });

            setLogs(prev => [...prev, { type: "info", content: "Funding confirmed! Agent will now purchase the item..." }]);

            // 3. Run Agent to Purchase Item
            const res = await fetch("/api/agents/auto-item-buyer/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemId: selectedItemId,
                    buyerAddress: account.address
                })
            });

            const data = await res.json();

            if (data.error) {
                setLogs(prev => [...prev, { type: "error", content: data.error }]);
            } else if (data.logs) {
                // Map logs to display format
                const formattedLogs = data.logs.map((l: any) => {
                    if (l.type === "step_start") {
                        return { type: "info", content: `Executing: ${l.step}`, timestamp: l.timestamp };
                    } else if (l.type === "step_end") {
                        return {
                            type: l.result?.error ? "error" : "success",
                            content: `Step ${l.step} completed`,
                            data: l.result,
                            timestamp: l.timestamp
                        };
                    }
                    return l;
                });
                setLogs(prev => [...prev, ...formattedLogs]);
            } else {
                setLogs(prev => [...prev, { type: "info", content: "Purchase completed!" }]);
            }
        } catch (e: any) {
            console.error(e);
            setLogs(prev => [...prev, { type: "error", content: e.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel glass-hover rounded-2xl p-6 mt-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="font-mono text-xs text-green-300 mb-2 opacity-80">TEMPLATE AGENT</div>
                    <h3 className="text-xl font-bold text-white">Auto Item Buyer Agent</h3>
                    <p className="text-sm text-gray-300 mt-1">
                        Automatically purchases items from the game store using x402 payments
                    </p>
                </div>
                <div>
                    <ConnectButton client={client} />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-gray-300 text-xs mb-2 font-medium">SELECT ITEM</label>
                <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full glass-input rounded-lg p-3 text-white focus:outline-none"
                >
                    {STORE_ITEMS.map(item => (
                        <option key={item.id} value={item.id} className="bg-gray-900">
                            {item.name} - {item.price} {item.token}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleRun}
                disabled={loading || !account}
                className="w-full glass-button text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                style={{
                    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(0, 0, 0, 0.8))",
                }}
            >
                {loading ? "Purchasing..." : "Buy Item Automatically"}
            </button>

            <div className="glass-console p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs text-green-300">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="opacity-50">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>{" "}
                        <span className={log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-400' : ''}>
                            {log.step ? `[${log.step}] ` : ""}

                            {/* Display purchase results */}
                            {log.data?.success && log.data?.purchase && (
                                <div className="ml-4 mt-1 text-green-300">
                                    ✓ Purchase successful! Item: {log.data.purchase.item?.name || log.data.purchase.itemId}
                                    {log.data.txHash && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            TX: {log.data.txHash.slice(0, 20)}...
                                        </div>
                                    )}
                                </div>
                            )}

                            {log.data?.error && (
                                <span className="text-red-400">Error: {log.data.error}</span>
                            )}

                            {!log.data && (
                                typeof log.content === 'string' ? log.content : JSON.stringify(log.data || log)
                            )}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && <span className="text-gray-500">Select an item and click Buy Item Automatically...</span>}
            </div>
        </div>
    );
}

