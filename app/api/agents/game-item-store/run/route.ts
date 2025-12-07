import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAgent } from "@/lib/agents/server";
import { verifyPayment, x402Response } from "@/lib/x402/server";
import { STORE_ITEMS } from "@/lib/store/items";
import { tools } from "@/lib/agents/tools";
import { getItemStock, decrementStock, isInStock, isBundleInStock, decrementBundleStock } from "@/lib/store/stock";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { action, itemId, buyerAddress, txHash } = body;

        // Get or create the agent
        const agent = await getOrCreateAgent("game-item-store");

        // Handle different actions
        if (action === "list" || !action) {
            // List items - no payment required (stock already included by tool)
            const result = await tools["store.listItems"]({});
            return NextResponse.json(result);
        }

        if (action === "get" && itemId) {
            // Get item details - no payment required
            const result = await tools["store.getItemById"]({ itemId });
            // Add stock information
            if (result.item) {
                result.item.stock = getItemStock(itemId);
            }
            return NextResponse.json(result);
        }

        if (action === "purchase" || action === "buy") {
            if (!itemId) {
                return NextResponse.json({ error: "itemId is required for purchase" }, { status: 400 });
            }

            // Find the item
            const item = STORE_ITEMS.find(i => i.id === itemId);
            if (!item) {
                return NextResponse.json({ error: `Item with id '${itemId}' not found` }, { status: 404 });
            }

            // Check stock availability (handle bundles differently)
            if (item.isBundle && item.bundleItems) {
                // For bundles, check if all items are in stock
                if (!isBundleInStock(item.bundleItems)) {
                    return NextResponse.json({ error: `Bundle '${item.name}' is out of stock (one or more items unavailable)` }, { status: 400 });
                }
            } else {
                // For single items, check individual stock
                if (!isInStock(itemId)) {
                    return NextResponse.json({ error: `Item '${item.name}' is out of stock` }, { status: 400 });
                }
            }

            // Check Payment - dynamic pricing based on item
            const requirement = {
                token: item.token,
                amount: item.price,
                destination: agent.wallet.address
            };

            const isPaid = await verifyPayment(req, requirement);

            if (!isPaid) {
                // Return 402 Payment Required with item-specific pricing
                return x402Response(requirement);
            }

            // Payment verified - record purchase
            if (!buyerAddress) {
                return NextResponse.json({ error: "buyerAddress is required" }, { status: 400 });
            }

            const purchaseResult = await tools["store.recordPurchase"]({
                agentId: agent.id,
                buyerAddress,
                itemId: item.id,
                itemName: item.name,
                amount: item.price,
                token: item.token,
                txHash: txHash || req.headers.get("x-payment-proof") || undefined
            });

            // Decrement stock after successful purchase
            let remainingStock: number | Record<string, number>;
            if (item.isBundle && item.bundleItems) {
                // For bundles, decrement all items and return stock for each
                const minStock = decrementBundleStock(item.bundleItems);
                remainingStock = {};
                item.bundleItems.forEach(bundleItemId => {
                    (remainingStock as Record<string, number>)[bundleItemId] = getItemStock(bundleItemId);
                });
            } else {
                // For single items, decrement and return single stock count
                remainingStock = decrementStock(itemId);
            }

            // Return purchase confirmation
            return NextResponse.json({
                success: true,
                item: {
                    id: item.id,
                    name: item.name
                },
                txHash: purchaseResult.purchase.txHash,
                buyerAddress: purchaseResult.purchase.buyerAddress,
                purchase: purchaseResult.purchase,
                remainingStock,
                isBundle: item.isBundle || false
            });
        }

        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

