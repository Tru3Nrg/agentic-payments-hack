
import { fundWallet, client, monadTestnet } from "../thirdweb/wallet";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { STORE_ITEMS, PurchaseRecord } from "../store/items";
import { getItemStock, isInStock, isBundleInStock } from "../store/stock";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const tools: any = {
    "http.get": async (input: { url: string }) => {
        try {
            const res = await fetch(input.url);
            return await res.json();
        } catch (e: any) {
            return { error: e.message };
        }
    },
    "llm.generate": async (input: { prompt: string }) => {
        // Mock LLM call for now, or use an API if available
        return {
            content: `[Mock LLM Output for: ${input.prompt}]`
        };
    },
    "x402.call": async (input: { url: string; payload: any }) => {
        // This will connect to the x402 client
        // For now returning a placeholder
        return { status: "payment_required_placeholder", url: input.url };
    },
    // New Tools
    "github.fetchReadme": async (input: { repo: string }) => {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/${input.repo}/master/README.md`);
            if (!res.ok) return null;
            return await res.text();
        } catch { return null; }
    },
    "github.fetchFundingFile": async (input: { repo: string }) => {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/${input.repo}/master/.github/FUNDING.yml`);
            if (!res.ok) return null;
            return await res.text();
        } catch { return null; }
    },
    "github.detectCryptoFunding": async (input: { repo: string, readme?: string, fundingFile?: string }) => {
        const content = (input.readme || "") + (input.fundingFile || "");
        const keywords = ["bitcoin", "lightning", "btc", "crypto", "ethereum", "monad"];
        const signals = keywords.filter(k => content.toLowerCase().includes(k));
        return {
            acceptsCrypto: signals.length > 0,
            signals
        };
    },
    "wallet.fundProjects": async (input: { agent: any, projects: Array<{ repo: string; to: string }> }) => {
        // We use the agent's wallet to send funds.
        // NOTE: In a real app we need the agent's private key to sign!
        // The AgentSpec currently only has encryptedKey (which is just the plain key in our MVP).
        if (!input.agent.wallet.encryptedKey) {
            return { error: "Agent wallet missing private key" };
        }

        const account = privateKeyToAccount({
            client,
            privateKey: input.agent.wallet.encryptedKey,
        });

        const results = [];
        for (const p of input.projects) {
            try {
                // Send 0.0001 MON (simulation of small funding)
                const transaction = prepareTransaction({
                    to: p.to,
                    chain: monadTestnet,
                    client,
                    value: toWei("0.0001"),
                });
                const { transactionHash } = await sendTransaction({ transaction, account });
                results.push({ repo: p.repo, to: p.to, status: "success", tx: transactionHash });
            } catch (e: any) {
                results.push({ repo: p.repo, to: p.to, status: "failed", error: e.message });
            }
        }
        return { fundingResults: results };
    },
    "github.searchRepositories": async (input: { query: string }) => {
        try {
            const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(input.query)}&sort=stars&order=desc`, {
                headers: {
                    "User-Agent": "Agentic-Payments-Hack-Agent",
                    "Accept": "application/vnd.github.v3+json"
                }
            });
            if (!res.ok) {
                return { error: `GitHub API error: ${res.status} ${res.statusText}` };
            }
            const data = await res.json();
            // Map to a cleaner format
            const repos = (data.items || []).slice(0, 10).map((r: any) => ({
                name: r.full_name,
                description: r.description,
                stars: r.stargazers_count,
                url: r.html_url
            }));
            return { repos };
        } catch (e: any) {
            return { error: e.message };
        }
    },
    "coinbase.getPrice": async (input: { pair: string }) => {
        try {
            // Basic Spot Price
            const pair = input.pair || "BTC-USD";
            const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`);
            if (!res.ok) throw new Error(`Coinbase API error: ${res.status}`);
            const data = await res.json();
            return { price: data.data.amount, currency: data.data.currency, source: "Coinbase" };
        } catch (e: any) {
            return { error: e.message };
        }
    },
    "amadeus.searchFlights": async (input: { origin: string; destination: string; departureDate: string; currencyCode?: string }) => {
        const clientId = process.env.AMADEUS_CLIENT_ID;
        const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return { error: "Amadeus API keys are missing in environment configuration." };
        }

        try {
            // 1. Get Access Token
            const authRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
            });

            if (!authRes.ok) {
                const err = await authRes.json();
                return { error: `Failed to authenticate with Amadeus: ${err.error_description || err.state}` };
            }

            const { access_token } = await authRes.json();

            // 2. Search Flights
            // Using a limit of 5 to keep the response concise
            let searchUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${input.origin}&destinationLocationCode=${input.destination}&departureDate=${input.departureDate}&adults=1&max=5`;

            if (input.currencyCode) {
                searchUrl += `&currencyCode=${input.currencyCode}`;
            }

            const flightRes = await fetch(searchUrl, {
                headers: {
                    "Authorization": `Bearer ${access_token}`
                }
            });

            if (!flightRes.ok) {
                const err = await flightRes.json();
                // Amadeus errors can be nested
                const issue = err.issues ? err.issues[0]?.detail : flightRes.statusText;
                return { error: `Flight search failed: ${issue}` };
            }

            const data = await flightRes.json();

            // Map to a simplified format for the agent
            const flights = (data.data || []).map((f: any) => {
                const itinerary = f.itineraries[0];
                const segments = itinerary.segments;
                const totalDuration = itinerary.duration;
                const price = f.price.total;
                const currency = f.price.currency;

                // Summarize first and last segment for departure/arrival
                const firstSegment = segments[0];
                const lastSegment = segments[segments.length - 1];
                const airline = firstSegment.carrierCode; // Simplification

                return {
                    price: `${price} ${currency}`,
                    airline,
                    departure: `${firstSegment.departure.iataCode} at ${firstSegment.departure.at}`,
                    arrival: `${lastSegment.arrival.iataCode} at ${lastSegment.arrival.at}`,
                    duration: totalDuration,
                    stops: segments.length - 1
                };
            });

            return { flights };

        } catch (e: any) {
            return { error: e.message };
        }
    },
    "amadeus.citySearch": async (input: { keyword: string }) => {
        const clientId = process.env.AMADEUS_CLIENT_ID;
        const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

        try {
            // 1. Get Access Token (TODO: Cache this in a real app)
            const authRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
            });
            const { access_token } = await authRes.json();

            // 2. Search City/Airport
            const res = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(input.keyword)}`, {
                headers: { "Authorization": `Bearer ${access_token}` }
            });

            if (!res.ok) return null;
            const data = await res.json();

            // Return first IATA code found
            if (data.data && data.data.length > 0) {
                return data.data[0].iataCode;
            }
            return null;
        } catch { return null; }
    },
    "github.searchIssues": async (input: { query: string }) => {
        try {
            // Default to searching for issues, not PRs, unless specified
            const q = input.query + " type:issue";
            const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc`, {
                headers: {
                    "User-Agent": "Agentic-Payments-Hack-Agent",
                    "Accept": "application/vnd.github.v3+json"
                }
            });
            if (!res.ok) {
                return { error: `GitHub API error: ${res.status} ${res.statusText}` };
            }
            const data = await res.json();
            const issues = (data.items || []).slice(0, 10).map((i: any) => ({
                title: i.title,
                url: i.html_url,
                repo: i.repository_url, // This is the API URL, not html
                labels: i.labels.map((l: any) => l.name)
            }));
            return { issues };
        } catch (e: any) {
            return { error: e.message };
        }
    },
    "github.searchUsers": async (input: { query: string }) => {
        try {
            const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(input.query)}&sort=followers&order=desc`, {
                headers: {
                    "User-Agent": "Agentic-Payments-Hack-Agent",
                    "Accept": "application/vnd.github.v3+json"
                }
            });
            if (!res.ok) {
                return { error: `GitHub API error: ${res.status} ${res.statusText}` };
            }
            const data = await res.json();
            const users = (data.items || []).slice(0, 10).map((u: any) => ({
                login: u.login,
                url: u.html_url,
                avatar: u.avatar_url,
                type: u.type
            }));
            return { users };
        } catch (e: any) {
            return { error: e.message };
        }
    },
    "store.listItems": async (input: {}) => {
        // Add stock information to items
        const itemsWithStock = STORE_ITEMS.map(item => {
            if (item.isBundle && item.bundleItems) {
                // For bundles, stock is based on whether all items are available
                const bundleInStock = isBundleInStock(item.bundleItems);
                return {
                    ...item,
                    stock: bundleInStock ? 1 : 0 // Show 1 if available, 0 if not
                };
            } else {
                return {
                    ...item,
                    stock: getItemStock(item.id)
                };
            }
        });
        return { items: itemsWithStock };
    },
    "store.getItemById": async (input: { itemId: string }) => {
        const item = STORE_ITEMS.find(i => i.id === input.itemId);
        if (!item) {
            return { error: `Item with id '${input.itemId}' not found` };
        }
        let stock;
        if (item.isBundle && item.bundleItems) {
            stock = isBundleInStock(item.bundleItems) ? 1 : 0;
        } else {
            stock = getItemStock(input.itemId);
        }
        return { item: { ...item, stock } };
    },
    "store.recordPurchase": async (input: {
        agentId: string;
        buyerAddress: string;
        itemId: string;
        itemName: string;
        amount: number;
        token: "MON";
        txHash?: string;
    }) => {
        const PURCHASES_DIR = path.join(process.cwd(), "data", "purchases");
        if (!fs.existsSync(PURCHASES_DIR)) {
            fs.mkdirSync(PURCHASES_DIR, { recursive: true });
        }

        const purchase: PurchaseRecord = {
            id: uuidv4(),
            agentId: input.agentId,
            buyerAddress: input.buyerAddress,
            itemId: input.itemId,
            itemName: input.itemName,
            amount: input.amount,
            token: input.token,
            paidAt: new Date().toISOString(),
            txHash: input.txHash
        };

        const purchasePath = path.join(PURCHASES_DIR, `${purchase.id}.json`);
        fs.writeFileSync(purchasePath, JSON.stringify(purchase, null, 2));

        return { purchase };
    },
    "store.purchaseItem": async (input: {
        agent: any;
        itemId: string;
        buyerAddress: string;
    }) => {
        // This tool automatically handles x402 payments using the agent's wallet
        if (!input.agent.wallet.encryptedKey) {
            return { error: "Agent wallet missing private key" };
        }

        const account = privateKeyToAccount({
            client,
            privateKey: input.agent.wallet.encryptedKey,
        });

        try {
            // Check stock before attempting purchase
            const item = STORE_ITEMS.find(i => i.id === input.itemId);
            if (!item) {
                return { error: `Item '${input.itemId}' not found` };
            }

            if (item.isBundle && item.bundleItems) {
                if (!isBundleInStock(item.bundleItems)) {
                    return { error: `Bundle '${input.itemId}' is out of stock (one or more items unavailable)` };
                }
            } else {
                if (!isInStock(input.itemId)) {
                    return { error: `Item '${input.itemId}' is out of stock` };
                }
            }

            // Step 1: Initial purchase request
            // For server-side calls, use localhost or construct from env
            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const initialRes = await fetch(`${baseUrl}/api/agents/game-item-store/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "purchase",
                    itemId: input.itemId,
                    buyerAddress: input.buyerAddress
                })
            });

            // Step 2: Handle 402 Payment Required
            if (initialRes.status === 402) {
                // Extract payment requirements
                const price = initialRes.headers.get("x-402-price");
                const token = initialRes.headers.get("x-402-token");
                const destination = initialRes.headers.get("x-402-destination");

                if (!price || !token || !destination) {
                    return { error: "Invalid 402 response: Missing payment headers" };
                }

                // Step 3: Send MON payment transaction using agent's wallet
                const transaction = prepareTransaction({
                    to: destination,
                    chain: monadTestnet,
                    client,
                    value: toWei(price),
                });

                const { transactionHash } = await sendTransaction({ transaction, account });

                // Step 4: Wait for confirmation
                await waitForReceipt({
                    client,
                    chain: monadTestnet,
                    transactionHash,
                });

                // Step 5: Retry purchase request with payment proof
                const retryRes = await fetch(`${baseUrl}/api/agents/game-item-store/run`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-payment-proof": transactionHash
                    },
                    body: JSON.stringify({
                        action: "purchase",
                        itemId: input.itemId,
                        buyerAddress: input.buyerAddress,
                        txHash: transactionHash
                    })
                });

                if (!retryRes.ok) {
                    const errorData = await retryRes.json();
                    return { error: errorData.error || `Purchase failed: ${retryRes.status}` };
                }

                const purchaseData = await retryRes.json();
                return { success: true, purchase: purchaseData, txHash: transactionHash };
            } else {
                // If not 402, check if it's already successful
                const data = await initialRes.json();
                if (initialRes.ok && data.success) {
                    return { success: true, purchase: data };
                } else {
                    return { error: data.error || "Purchase failed" };
                }
            }
        } catch (e: any) {
            return { error: e.message };
        }
    }
};
