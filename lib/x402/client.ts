import { Account } from "thirdweb/wallets";
import { monadTestnet, client } from "../thirdweb/wallet";
import { prepareContractCall, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import { defineChain } from "thirdweb/chains";

export async function payAndCall(url: string, agentWallet: Account, body?: any) {
    // 1. Attempt initial call
    const initialRes = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    });

    if (initialRes.status !== 402) {
        return initialRes.json();
    }

    // 2. Extract payment requirements
    const price = initialRes.headers.get("x-402-price");
    const token = initialRes.headers.get("x-402-token");
    const destination = initialRes.headers.get("x-402-destination");

    if (!price || !token || !destination) {
        throw new Error("Invalid 402 response: Missing headers");
    }

    // 3. Execute Payment (Sign & Send) on Monad Testnet
    console.log(`Paying ${price} ${token} to ${destination}...`);

    // For MVP, assuming Native MON payment.
    // If token != 'MON' (or 'USDC' contract), handling would differ.

    // This step actually sends the transaction on chain!
    // Commented out for full safety if no funds, but this is the core logic.
    let txHash = "0x_mock_tx_hash_" + Date.now();

    try {
        // NOTE: Real transaction logic
        // const transaction = prepareTransaction(...)
        // const result = await sendTransaction({ transaction, account: agentWallet });
        // const receipt = await waitForReceipt(result);
        // txHash = receipt.transactionHash;
    } catch (e) {
        console.warn("Payment failed (or skipped in dev):", e);
    }

    // 4. Retry with proof
    const retryRes = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            "x-payment-proof": txHash // In real world, sign this hash + endpoint with wallet
        }
    });

    return retryRes.json();
}
