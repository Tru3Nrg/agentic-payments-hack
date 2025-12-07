import { AgentSpec } from "@/lib/agents/spec";
import fs from "fs";
import path from "path";

// In-memory storage for serverless environments (Vercel, etc.)
// This works but doesn't persist across deployments
// For production, consider upgrading to Vercel KV or a database
const agentStore = new Map<string, AgentSpec>();

// Try to load existing agents from filesystem (for local dev and initial migration)
const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

function loadFromFilesystem(): void {
    // Only try to load from filesystem if directory exists (local dev)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            if (fs.existsSync(AGENTS_DIR)) {
                const files = fs.readdirSync(AGENTS_DIR);
                for (const file of files) {
                    if (file.endsWith(".json")) {
                        try {
                            const filePath = path.join(AGENTS_DIR, file);
                            const content = fs.readFileSync(filePath, "utf-8");
                            const agent: AgentSpec = JSON.parse(content);
                            agentStore.set(agent.id, agent);
                        } catch (err) {
                            console.error(`Error loading agent from ${file}:`, err);
                        }
                    }
                }
            }
        } catch (err) {
            // Filesystem operations may fail in serverless - that's okay
            console.warn("Could not load agents from filesystem (expected in serverless):", err);
        }
    }
}

// Load agents on module initialization
if (typeof window === "undefined") {
    // Only run on server side
    loadFromFilesystem();
}

export async function getAgent(id: string): Promise<AgentSpec | null> {
    // Check in-memory store first
    const agent = agentStore.get(id);
    if (agent) {
        return agent;
    }

    // Fallback to filesystem (for local dev or if not yet loaded)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            const agentPath = path.join(AGENTS_DIR, `${id}.json`);
            if (fs.existsSync(agentPath)) {
                const content = fs.readFileSync(agentPath, "utf-8");
                const agent: AgentSpec = JSON.parse(content);
                // Cache it in memory
                agentStore.set(id, agent);
                return agent;
            }
        } catch (err) {
            // Filesystem may not be available in serverless
        }
    }

    return null;
}

export async function saveAgent(agent: AgentSpec): Promise<void> {
    // Save to in-memory store
    agentStore.set(agent.id, agent);

    // Try to save to filesystem (for local dev only)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            if (!fs.existsSync(AGENTS_DIR)) {
                fs.mkdirSync(AGENTS_DIR, { recursive: true });
            }
            const agentPath = path.join(AGENTS_DIR, `${agent.id}.json`);
            fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2));
        } catch (err) {
            // Filesystem write may fail in serverless - that's expected
            // The in-memory store will still work
            console.warn("Could not write agent to filesystem (expected in serverless):", err);
        }
    }
}

export async function listAgents(): Promise<AgentSpec[]> {
    const agents: AgentSpec[] = [];

    // Get all agents from in-memory store
    agentStore.forEach((agent) => {
        agents.push(agent);
    });

    // Also check filesystem for any agents not yet loaded (local dev)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            if (fs.existsSync(AGENTS_DIR)) {
                const files = fs.readdirSync(AGENTS_DIR);
                for (const file of files) {
                    if (file.endsWith(".json")) {
                        const id = file.replace(".json", "");
                        if (!agentStore.has(id)) {
                            try {
                                const filePath = path.join(AGENTS_DIR, file);
                                const content = fs.readFileSync(filePath, "utf-8");
                                const agent: AgentSpec = JSON.parse(content);
                                agentStore.set(agent.id, agent);
                                agents.push(agent);
                            } catch (err) {
                                console.error(`Error reading agent file ${file}:`, err);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            // Filesystem may not be available
        }
    }

    return agents;
}

