
import { NextResponse } from "next/server";
import { getOrCreateAgent } from "@/lib/agents/server";
import { runAgent } from "@/lib/agents/runtime";
import { tools } from "@/lib/agents/tools";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const prompt = (body.prompt || "").trim();

        // Default
        let inputOverride: any = {
            origin: "SFO",
            destination: "JFK",
            departureDate: "2025-12-25",
            currencyCode: "USD"
        };

        // 1. Simple Regex Extraction (Heuristic)
        // Matches "from [Origin] to [Dest]"
        const fromToRegex = /from\s+([A-Za-z\s]+)\s+to\s+([A-Za-z\s]+)/i;
        const match = prompt.match(fromToRegex);

        if (match) {
            let originRaw = match[1].trim();
            let destRaw = match[2].trim();

            console.log(`Extracted: From '${originRaw}' To '${destRaw}'`);

            // Helper to resolve IATA if not 3 chars
            const resolveIATA = async (val: string) => {
                if (val.length === 3 && val === val.toUpperCase()) return val; // already IATA
                // Call tool to lookup
                console.log(`Resolving '${val}'...`);
                return await tools["amadeus.citySearch"]({ keyword: val }) || val;
            };

            const [originIATA, destIATA] = await Promise.all([
                resolveIATA(originRaw),
                resolveIATA(destRaw)
            ]);

            inputOverride.origin = originIATA;
            inputOverride.destination = destIATA;
        }

        console.log("Running Flight Search Agent with inputs:", inputOverride);

        // Run Agent
        const agent = await getOrCreateAgent("flight-search-agent");
        const result = await runAgent(agent, inputOverride);

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
