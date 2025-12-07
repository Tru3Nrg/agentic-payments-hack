import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import { privateKeyToAccount, randomPrivateKey } from "thirdweb/wallets";
import { defineChain, getChainMetadata } from "thirdweb/chains";
import { createWallet, getWalletBalance } from "thirdweb/wallets";
import { eth_getBalance } from "thirdweb/rpc";

// Initialize client with fallback
const secretKey = process.env.THIRDWEB_SECRET_KEY;
const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;

if (!secretKey && !clientId) {
    console.warn("Missing THIRDWEB_SECRET_KEY and NEXT_PUBLIC_TEMPLATE_CLIENT_ID. Wallet operations may fail.");
}

export const client = secretKey
    ? createThirdwebClient({ secretKey })
    : createThirdwebClient({ clientId: clientId || "" });

// Define Monad Testnet
export const monadTestnet = defineChain({
    id: 10143,
    rpc: "https://testnet-rpc.monad.xyz",
    nativeCurrency: {
        name: "Monad",
        symbol: "MON",
        decimals: 18,
    },
});

export async function createAgentWallet() {
    const privateKey = randomPrivateKey();
    const account = privateKeyToAccount({
        client,
        privateKey,
    });
    // Return both the account object and the private key so the caller can store it
    return { account, privateKey };
}

export async function getAgentBalance(address: string) {
    const balance = await getWalletBalance({
        address,
        chain: monadTestnet,
        client,
    });
    return balance;
}

export async function fundWallet(toAddress: string, amount: string) {
    const privateKey = process.env.MASTER_PRIVATE_KEY;
    if (!privateKey) {
        console.warn("No MASTER_PRIVATE_KEY found, skipping funding");
        return;
    }

    // Handle potential missing 0x prefix for safety
    const formattedKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;

    const account = privateKeyToAccount({
        client,
        privateKey: formattedKey,
    });

    try {
        const transaction = import("thirdweb").then(({ prepareTransaction }) => {
            return prepareTransaction({
                to: toAddress,
                chain: monadTestnet,
                client,
                value: toWei(amount),
            });
        });

        // Wait for dynamic import if needed, or just use imported:
        // Actually we have static imports. Let's simplfy.
        // But previously fundWallet was kind of broken or just a placeholder.
        // Let's implement the simple native transfer again properly.

        const tx = import("thirdweb").then(async (mod) => {
            const transaction = mod.prepareTransaction({
                to: toAddress,
                chain: monadTestnet,
                client,
                value: mod.toWei(amount),
            });
            return await mod.sendTransaction({ transaction, account });
        });

        return tx;

    } catch (e) {
        console.error("Fund wallet error:", e);
        throw e;
    }
}
