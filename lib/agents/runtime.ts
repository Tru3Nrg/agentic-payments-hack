import { AgentSpec } from "./spec";
import { tools } from "./tools";

export async function runAgent(spec: AgentSpec, input: any) {
    const logs: any[] = [];
    let lastOutput = null;

    logs.push({ type: "start", timestamp: Date.now() });

    for (const step of spec.logic.steps) {
        logs.push({ type: "step_start", step: step.type, timestamp: Date.now() });

        let result;
        try {
            if (step.type === "http.get") {
                const url = input?.url || step.input?.url;
                result = await tools["http.get"]({ url });
            } else if (step.type === "llm.generate") {
                // In a real agent, we might interpolate input into the prompt
                result = await tools["llm.generate"]({ prompt: step.input.prompt || "No prompt" });
            } else if (step.type === "x402.call") {
                result = await tools["x402.call"](step.input);
            } else if (step.type === "coinbase.getPrice") {
                // Allow input override from the call
                const payload = { ...step.input, ...(input || {}) };
                result = await tools["coinbase.getPrice"](payload);
            } else if (step.type === "amadeus.searchFlights") {
                // Allow input override from the call
                const payload = { ...step.input, ...(input || {}) };
                result = await tools["amadeus.searchFlights"](payload);
            } else if (step.type === "github.fetchAndAnalyzeAll") {
                // Runtime Macro Step
                const { OSS_REPOS, FUNDING_REGISTRY } = await import("./spec");
                const repos = OSS_REPOS; // hardcoded logic as per spec using 'reposVar'

                const analyzed = [];
                for (const repo of repos) {
                    const readme = await tools["github.fetchReadme"]({ repo }) || "";
                    const funding = await tools["github.fetchFundingFile"]({ repo }) || "";
                    const detection = await tools["github.detectCryptoFunding"]({ repo, readme, fundingFile: funding });

                    if (detection.acceptsCrypto) {
                        const address = FUNDING_REGISTRY[repo];
                        if (address) {
                            analyzed.push({ repo, to: address, signals: detection.signals });
                        }
                    }
                }
                result = { projectsToFund: analyzed };
            } else if (step.type === "wallet.fundProjects") {
                // Runtime Macro Step
                // Input comes from previous step result usually, or we pass it explicit
                // For this MVP, we look at lastOutput.
                // The step input has 'fromRegistryVar' but we resolved that in previous step or here.
                // We will assume 'projectsToFund' is in the input OR last output.

                const projects: any[] = input?.projectsToFund || lastOutput?.projectsToFund || [];
                // Apply caps: maxProjectsPerRun = 5
                const toFund = projects.slice(0, 5);

                result = await tools["wallet.fundProjects"]({ agent: spec, projects: toFund });
            } else if (step.type === "store.handleAction") {
                // Store action handler - routes to different store operations based on input
                const action = input?.action || "list";
                const payload = { ...step.input, ...(input || {}) };

                if (action === "list" || action === "listItems") {
                    result = await tools["store.listItems"]({});
                } else if (action === "get" || action === "getItem") {
                    result = await tools["store.getItemById"]({ itemId: payload.itemId });
                } else if (action === "purchase" || action === "buy") {
                    // Purchase is handled by the API route, not here
                    result = { error: "Purchase action should be handled via API route with payment verification" };
                } else {
                    result = { error: `Unknown store action: ${action}` };
                }
            } else if (step.type === "store.purchaseItem") {
                // Auto-purchase item using agent's wallet
                const payload = { ...step.input, ...(input || {}) };
                if (!payload.itemId) {
                    result = { error: "itemId is required for purchase" };
                } else if (!payload.buyerAddress) {
                    result = { error: "buyerAddress is required for purchase" };
                } else {
                    result = await tools["store.purchaseItem"]({
                        agent: spec,
                        itemId: payload.itemId,
                        buyerAddress: payload.buyerAddress
                    });
                }
            } else if (tools[step.type]) {
                // Generic tool handler
                result = await tools[step.type](step.input || {});
            } else {
                result = { error: `Unknown step type: ${step.type}` };
            }
        } catch (e: any) {
            result = { error: e.message };
        }

        lastOutput = result;
        logs.push({ type: "step_end", step: step.type, result, timestamp: Date.now() });
    }

    logs.push({ type: "complete", timestamp: Date.now() });

    return { output: lastOutput, logs };
}
