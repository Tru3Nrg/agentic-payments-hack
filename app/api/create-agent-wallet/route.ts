import { createAgentWallet } from "@/lib/thirdweb/wallet";

export async function POST() {
    try {
        const { account, privateKey } = await createAgentWallet();

        return Response.json({
            address: account.address,
            privateKey: privateKey
        });
    } catch (error: any) {
        console.error("Error creating agent wallet:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
