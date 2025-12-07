import { createThirdwebClient, prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const monadTestnet = defineChain({
    id: 10143,
    rpc: "https://testnet-rpc.monad.xyz",
    nativeCurrency: {
        name: "Monad",
        symbol: "MON",
        decimals: 18,
    },
});

async function main() {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;
    const privateKey = process.env.MASTER_PRIVATE_KEY;

    if (!privateKey) {
        console.error("Missing MASTER_PRIVATE_KEY");
        return;
    }

    if (!secretKey && !clientId) {
        console.error("Missing THIRDWEB keys");
        return;
    }

    // Append 0x if missing
    const formattedKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;

    const client = secretKey
        ? createThirdwebClient({ secretKey })
        : createThirdwebClient({ clientId: clientId || "" });

    const account = privateKeyToAccount({ client, privateKey: formattedKey });

    console.log(`Sending from: ${account.address}`);

    const amount = "0.0001";
    const to = "0x89D57559481224030F80480Bb0bb82fb5bD1331a";

    console.log(`Sending ${amount} MON to ${to}...`);

    try {
        const transaction = prepareTransaction({
            to,
            chain: monadTestnet,
            client,
            value: toWei(amount),
        });

        const { transactionHash } = await sendTransaction({ transaction, account });
        console.log(`Transaction sent! Hash: ${transactionHash}`);

        console.log("Waiting for receipt...");
        const receipt = await waitForReceipt({ client, chain: monadTestnet, transactionHash });
        console.log("Transaction confirmed in block:", receipt.blockNumber);

    } catch (error) {
        console.error("Transaction failed:", error);
    }
}

main();
