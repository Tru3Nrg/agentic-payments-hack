import { NextRequest, NextResponse } from "next/server";

export interface PaymentRequirement {
    token: string; // e.g., "MON" or "USDC"
    amount: number;
    destination: string;
}

export function x402Response(requirement: PaymentRequirement) {
    return new NextResponse(JSON.stringify({ error: "Payment Required" }), {
        status: 402,
        headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": `x402 token="${requirement.token}", amount="${requirement.amount}", destination="${requirement.destination}"`,
            "x-402-price": requirement.amount.toString(),
            "x-402-token": requirement.token,
            "x-402-destination": requirement.destination
        },
    });
}

export async function verifyPayment(req: NextRequest, requirement: PaymentRequirement): Promise<boolean> {
    const proof = req.headers.get("x-payment-proof");

    // For MVP/Hackathon:
    // We check if the proof exists. In a real system, we'd verify the transaction on chain
    // or verify the signature provided in the proof.
    // We define a simple format for proof: "txhash:SIGNATURE"

    if (!proof) return false;

    // Simulate verification: always return true if proof is present for now
    // Real implementation would allow checking tx status on monad testnet
    return true;
}
