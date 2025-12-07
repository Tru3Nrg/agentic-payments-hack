"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { STORE_ITEMS, StoreItem } from "@/lib/store/items";
const STORE_ITEMS_IMPORT = STORE_ITEMS; // Keep reference for bundle images
import { monadTestnet, client as walletClient } from "@/lib/thirdweb/wallet";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || "",
});

interface PurchaseStatus {
    itemId: string;
    status: "idle" | "requesting" | "payment-required" | "paying" | "confirming" | "success" | "error";
    message?: string;
    txHash?: string;
    purchaseData?: any;
}

export default function GameStorePage() {
    const account = useActiveAccount();
    // Initialize with stock: 10 for each item
    const [items, setItems] = useState<StoreItem[]>(STORE_ITEMS.map(item => ({ ...item, stock: 10 })));
    const [purchaseStatuses, setPurchaseStatuses] = useState<Record<string, PurchaseStatus>>({});
    const [agentWallet, setAgentWallet] = useState<string>("");

    // Fetch agent wallet address and stock on mount
    useEffect(() => {
        fetch("/api/agents/game-item-store/address")
            .then(res => res.json())
            .then(addrData => {
                if (addrData.address) {
                    setAgentWallet(addrData.address);
                }
            })
            .catch(() => {});

        // Fetch items with stock
        fetch("/api/agents/game-item-store/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "list" })
        })
            .then(res => res.json())
            .then(data => {
                if (data.items) {
                    // Ensure stock is set (default to 10 if missing)
                    const itemsWithStock = data.items.map((item: StoreItem) => ({
                        ...item,
                        stock: item.stock ?? 10
                    }));
                    setItems(itemsWithStock);
                } else {
                    // Fallback: use STORE_ITEMS with default stock
                    setItems(STORE_ITEMS.map(item => ({ ...item, stock: 10 })));
                }
            })
            .catch(() => {
                // Fallback on error: use STORE_ITEMS with default stock
                setItems(STORE_ITEMS.map(item => ({ ...item, stock: 10 })));
            });
    }, []);

    const handlePurchase = async (item: StoreItem) => {
        if (!account) {
            alert("Please connect your wallet to purchase items");
            return;
        }

        const itemId = item.id;
        setPurchaseStatuses(prev => ({
            ...prev,
            [itemId]: { itemId, status: "requesting", message: "Requesting purchase..." }
        }));

        try {
            // Step 1: Initial purchase request
            const initialRes = await fetch("/api/agents/game-item-store/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "purchase",
                    itemId: item.id,
                    buyerAddress: account.address
                })
            });

            // Step 2: Handle 402 Payment Required
            if (initialRes.status === 402) {
                setPurchaseStatuses(prev => ({
                    ...prev,
                    [itemId]: { itemId, status: "payment-required", message: "Payment required. Processing..." }
                }));

                // Extract payment requirements
                const price = initialRes.headers.get("x-402-price");
                const token = initialRes.headers.get("x-402-token");
                const destination = initialRes.headers.get("x-402-destination");

                if (!price || !token || !destination) {
                    throw new Error("Invalid 402 response: Missing payment headers");
                }

                setAgentWallet(destination);

                setPurchaseStatuses(prev => ({
                    ...prev,
                    [itemId]: { itemId, status: "paying", message: `Sending ${price} ${token}... Please confirm in wallet.` }
                }));

                // Step 3: Send MON payment transaction
                const transaction = prepareTransaction({
                    to: destination,
                    chain: monadTestnet,
                    client: walletClient,
                    value: toWei(price),
                });

                const { transactionHash } = await sendTransaction({ transaction, account });

                setPurchaseStatuses(prev => ({
                    ...prev,
                    [itemId]: { itemId, status: "confirming", message: "Waiting for transaction confirmation...", txHash: transactionHash }
                }));

                // Step 4: Wait for confirmation
                await waitForReceipt({
                    client: walletClient,
                    chain: monadTestnet,
                    transactionHash,
                });

                setPurchaseStatuses(prev => ({
                    ...prev,
                    [itemId]: { itemId, status: "requesting", message: "Transaction confirmed. Completing purchase..." }
                }));

                // Step 5: Retry purchase request with payment proof
                const retryRes = await fetch("/api/agents/game-item-store/run", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-payment-proof": transactionHash
                    },
                    body: JSON.stringify({
                        action: "purchase",
                        itemId: item.id,
                        buyerAddress: account.address,
                        txHash: transactionHash
                    })
                });

                if (!retryRes.ok) {
                    const errorData = await retryRes.json();
                    throw new Error(errorData.error || `Purchase failed: ${retryRes.status}`);
                }

                const purchaseData = await retryRes.json();

                // Step 6: Success! Update stock in UI
                if (purchaseData.remainingStock !== undefined) {
                    setItems(prev => prev.map(i =>
                        i.id === itemId ? { ...i, stock: purchaseData.remainingStock } : i
                    ));
                } else {
                    // Refresh stock from server
                    fetch("/api/agents/game-item-store/run", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "list" })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.items) {
                                setItems(data.items);
                            }
                        })
                        .catch(() => {});
                }

                setPurchaseStatuses(prev => ({
                    ...prev,
                    [itemId]: {
                        itemId,
                        status: "success",
                        message: `Successfully purchased ${item.name}!`,
                        txHash: transactionHash,
                        purchaseData
                    }
                }));
            } else {
                // If not 402, check if it's already successful or an error
                const data = await initialRes.json();
                if (initialRes.ok && data.success) {
                    // Refresh stock
                    if (data.remainingStock !== undefined) {
                        setItems(prev => prev.map(i =>
                            i.id === itemId ? { ...i, stock: data.remainingStock } : i
                        ));
                    } else {
                        fetch("/api/agents/game-item-store/run", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "list" })
                        })
                            .then(res => res.json())
                            .then(listData => {
                                if (listData.items) {
                                    setItems(listData.items);
                                }
                            })
                            .catch(() => {});
                    }

                    setPurchaseStatuses(prev => ({
                        ...prev,
                        [itemId]: {
                            itemId,
                            status: "success",
                            message: `Successfully purchased ${item.name}!`,
                            purchaseData: data
                        }
                    }));
                } else {
                    throw new Error(data.error || "Purchase failed");
                }
            }
        } catch (error: any) {
            setPurchaseStatuses(prev => ({
                ...prev,
                [itemId]: {
                    itemId,
                    status: "error",
                    message: error.message || "Purchase failed. Please try again."
                }
            }));
        }
    };

    const getStatusColor = (status: PurchaseStatus["status"]) => {
        switch (status) {
            case "success": return "text-green-400";
            case "error": return "text-red-400";
            case "payment-required":
            case "paying":
            case "confirming":
            case "requesting": return "text-yellow-400";
            default: return "text-gray-400";
        }
    };

    return (
        <div className="min-h-screen text-white p-8 relative overflow-hidden">

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12 glass-panel glass-hover rounded-2xl p-8">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-gray-200 to-purple-300 text-transparent bg-clip-text">
                        Game Item Store
                    </h1>
                    <p className="text-xl text-gray-200 mb-6">
                        Purchase virtual items using MON via x402 payments on Monad testnet
                    </p>
                    <div className="flex justify-center">
                        <ConnectButton client={client} />
                    </div>
                    {agentWallet && (
                        <p className="text-sm text-gray-300 mt-4">
                            Store Wallet: <span className="font-mono text-purple-300">{agentWallet.slice(0, 10)}...{agentWallet.slice(-8)}</span>
                        </p>
                    )}
                </div>

                {/* Items Grid */}
                <div className={`grid grid-cols-1 ${items.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>
                    {items.map((item) => {
                        const status = purchaseStatuses[item.id] || { itemId: item.id, status: "idle" as const };
                        const isLoading = ["requesting", "payment-required", "paying", "confirming"].includes(status.status);

                        return (
                            <div
                                key={item.id}
                                className="glass-panel glass-hover rounded-2xl p-6 flex flex-col"
                            >
                                {/* Item Image */}
                                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-[#0f1419] border border-[#1e2a3a] flex items-center justify-center">
                                    {item.isBundle && item.bundleItems ? (
                                        // Show both images side by side for bundles
                                        <div className="flex gap-2 w-full h-full p-2">
                                            {item.bundleItems.map((bundleItemId, idx) => {
                                                const bundleItem = items.find(i => i.id === bundleItemId) || STORE_ITEMS.find(i => i.id === bundleItemId);
                                                return bundleItem?.image ? (
                                                    <div key={idx} className="flex-1 relative">
                                                        <Image
                                                            src={bundleItem.image}
                                                            alt={bundleItem.name}
                                                            width={200}
                                                            height={200}
                                                            className="object-contain w-full h-full"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : item.image ? (
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            width={400}
                                            height={400}
                                            className="object-contain w-full h-full"
                                            unoptimized
                                            onError={(e) => {
                                                // Show placeholder on error
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = `
                                                        <div class="flex flex-col items-center justify-center text-gray-500">
                                                            <svg class="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                            </svg>
                                                            <span class="text-xs">Image not found</span>
                                                        </div>
                                                    `;
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <span className="text-xs text-gray-400">No image available</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4 flex-grow">
                                    <h2 className="text-2xl font-bold text-purple-300 mb-2">
                                        {item.name}
                                        {item.isBundle && (
                                            <span className="ml-2 text-sm bg-green-500/80 backdrop-blur-sm text-white px-2 py-1 rounded">10% OFF</span>
                                        )}
                                    </h2>
                                    <p className="text-gray-200">{item.description}</p>
                                    {item.isBundle && (
                                        <p className="text-xs text-yellow-400 mt-2">
                                            Regular price: {(item.price / 0.9).toFixed(4)} MON | You save: {((item.price / 0.9) - item.price).toFixed(4)} MON
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-3xl font-bold text-white">{item.price}</span>
                                        <span className="text-lg text-gray-400 ml-2">{item.token}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Stock</div>
                                        <div className={`text-xl font-bold ${(item.stock ?? 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.isBundle ? ((item.stock ?? 0) > 0 ? 'Available' : 'Unavailable') : (item.stock ?? 0)}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePurchase(item)}
                                    disabled={!account || isLoading || (item.stock ?? 0) === 0}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                                        !account
                                            ? "glass-input text-gray-500 cursor-not-allowed"
                                            : (item.stock ?? 0) === 0
                                            ? "glass-input text-gray-500 cursor-not-allowed"
                                            : isLoading
                                            ? "glass-button text-white cursor-wait"
                                            : status.status === "success"
                                            ? "glass-button text-white"
                                            : "glass-button text-white"
                                    }`}
                                    style={!account || (item.stock ?? 0) === 0 ? {} : {
                                        background: isLoading
                                            ? "linear-gradient(135deg, rgba(234, 179, 8, 0.8), rgba(251, 191, 36, 0.8))"
                                            : status.status === "success"
                                            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(59, 130, 246, 0.8))"
                                            : "linear-gradient(135deg, rgba(147, 51, 234, 0.8), rgba(59, 130, 246, 0.8))"
                                    }}
                                >
                                    {status.status === "success"
                                        ? "✓ Purchased"
                                        : isLoading
                                        ? status.message || "Processing..."
                                        : (item.stock ?? 0) === 0
                                        ? "Out of Stock"
                                        : `Buy ${item.name}`}
                                </button>

                                {status.message && status.status !== "idle" && (
                                    <p className={`mt-3 text-sm ${getStatusColor(status.status)}`}>
                                        {status.message}
                                    </p>
                                )}

                                {status.txHash && (
                                    <p className="mt-2 text-xs text-gray-500 font-mono">
                                        TX: {status.txHash.slice(0, 20)}...
                                    </p>
                                )}

                                {status.purchaseData && (
                                    <div className="mt-4 p-3 glass-dark rounded-lg border border-green-500/30">
                                        <p className="text-sm text-green-300">
                                            Purchase confirmed! Item ID: {status.purchaseData.item?.id}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Info Section */}
                <div className="glass-panel glass-hover rounded-2xl p-8 mt-8">
                    <h3 className="text-xl font-bold mb-4 text-purple-300">How it works</h3>
                    <div className="space-y-2 text-gray-200">
                        <p>1. Connect your wallet using the button above</p>
                        <p>2. Click "Buy" on any item you want to purchase</p>
                        <p>3. The server will respond with a 402 Payment Required status</p>
                        <p>4. Your wallet will prompt you to send {STORE_ITEMS[0].price} MON to the store wallet</p>
                        <p>5. After confirmation, the purchase is recorded and you receive confirmation</p>
                        <p className="mt-4 text-sm text-gray-500">
                            All transactions happen on Monad testnet. Make sure you have testnet MON in your wallet.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

