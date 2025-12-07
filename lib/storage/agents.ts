import { AgentSpec } from "@/lib/agents/spec";
import fs from "fs";
import path from "path";

// Try to initialize Vercel KV (Redis) for persistent storage
// Vercel KV automatically reads from KV_REST_API_URL and KV_REST_API_TOKEN env vars
let kv: any = null;
let kvInitialized = false;

async function initKV() {
    if (kvInitialized) return;
    kvInitialized = true;

    // Check if KV environment variables are set
    const hasKVEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    if (hasKVEnv && !kv) {
        try {
            // @vercel/kv exports kv as a named export
            const vercelKvModule = await import("@vercel/kv");
            kv = vercelKvModule.kv;

            // Test the connection
            if (kv) {
                console.log("Vercel KV initialized successfully");
                // Test write/read to verify it works
                try {
                    await kv.set("__test__", "ok");
                    const testValue = await kv.get("__test__");
                    if (testValue === "ok") {
                        await kv.del("__test__");
                        console.log("Vercel KV connection verified");
                    }
                } catch (testErr) {
                    console.warn("Vercel KV connection test failed:", testErr);
                }
            }
        } catch (err) {
            // KV not available, will use fallback storage
            console.warn("Vercel KV not available, using fallback storage:", err);
            kv = null;
        }
    } else {
        if (!process.env.KV_REST_API_URL) {
            console.log("KV_REST_API_URL not set");
        }
        if (!process.env.KV_REST_API_TOKEN) {
            console.log("KV_REST_API_TOKEN not set");
        }
        console.log("Vercel KV environment variables not set, using fallback storage");
    }
}

// In-memory cache (for performance, not primary storage)
const agentCache = new Map<string, AgentSpec>();

// Try to load existing agents from filesystem (for local dev and initial migration)
const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

// Key prefix for KV storage
const KV_PREFIX = "agent:";
const KV_INDEX_KEY = "agents:index";

async function loadFromKV(): Promise<void> {
    if (!kv) return;

    try {
        const index = await kv.get(KV_INDEX_KEY);
        if (index && Array.isArray(index)) {
            for (const id of index) {
                try {
                    const agentData = await kv.get(`${KV_PREFIX}${id}`);
                    if (agentData) {
                        agentCache.set(id, agentData);
                    }
                } catch (err) {
                    console.error(`Error loading agent ${id} from KV:`, err);
                }
            }
        }
    } catch (err) {
        console.warn("Could not load agents from KV:", err);
    }
}

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
                            agentCache.set(agent.id, agent);
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

export async function getAgent(id: string): Promise<AgentSpec | null> {
    // Ensure KV is initialized
    await initKV();

    // Check cache first
    const cached = agentCache.get(id);
    if (cached) {
        return cached;
    }

    // Try KV storage (for Vercel/production)
    if (kv) {
        try {
            console.log(`Loading agent ${id} from KV...`);
            const agentData = await kv.get(`${KV_PREFIX}${id}`);
            if (agentData) {
                // Vercel KV returns the object directly (handles JSON automatically)
                agentCache.set(id, agentData as AgentSpec);
                console.log(`Agent ${id} loaded from KV successfully`);
                return agentData as AgentSpec;
            } else {
                console.log(`Agent ${id} not found in KV`);
            }
        } catch (err) {
            console.error(`Error reading agent ${id} from KV:`, err);
        }
    } else {
        console.log(`KV not available, checking filesystem for agent ${id}`);
    }

    // Fallback to filesystem (for local dev)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            const agentPath = path.join(AGENTS_DIR, `${id}.json`);
            if (fs.existsSync(agentPath)) {
                const content = fs.readFileSync(agentPath, "utf-8");
                const agent: AgentSpec = JSON.parse(content);
                // Cache it
                agentCache.set(id, agent);
                return agent;
            }
        } catch (err) {
            // Filesystem may not be available in serverless
        }
    }

    return null;
}

export async function saveAgent(agent: AgentSpec): Promise<void> {
    // Ensure KV is initialized
    await initKV();

    // Update cache
    agentCache.set(agent.id, agent);

    // Save to KV storage (for Vercel/production)
    if (kv) {
        try {
            console.log(`Saving agent ${agent.id} to KV...`);
            // Vercel KV handles JSON serialization automatically
            await kv.set(`${KV_PREFIX}${agent.id}`, agent);

            // Update index
            const index = (await kv.get(KV_INDEX_KEY)) || [];
            if (!Array.isArray(index) || !index.includes(agent.id)) {
                const newIndex = Array.isArray(index) ? [...index, agent.id] : [agent.id];
                await kv.set(KV_INDEX_KEY, newIndex);
            }

            // Verify it was saved by reading it back
            const verify = await kv.get(`${KV_PREFIX}${agent.id}`);
            if (verify) {
                console.log(`Agent ${agent.id} saved to KV successfully and verified`);
            } else {
                console.warn(`Agent ${agent.id} save verification failed - may have propagation delay`);
            }
        } catch (err) {
            console.error(`Error saving agent ${agent.id} to KV:`, err);
            // Don't throw - allow fallback to continue
        }
    } else {
        console.warn(`KV not available, agent ${agent.id} only cached in memory (will not persist)`);
    }

    // Try to save to filesystem (for local dev)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            if (!fs.existsSync(AGENTS_DIR)) {
                fs.mkdirSync(AGENTS_DIR, { recursive: true });
            }
            const agentPath = path.join(AGENTS_DIR, `${agent.id}.json`);
            fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2));
        } catch (err) {
            // Filesystem write may fail in serverless - that's expected
            console.warn("Could not write agent to filesystem (expected in serverless):", err);
        }
    }
}

export async function listAgents(): Promise<AgentSpec[]> {
    // Ensure KV is initialized
    await initKV();

    const agents: AgentSpec[] = [];
    const seenIds = new Set<string>();

    // Get all agents from cache
    agentCache.forEach((agent) => {
        agents.push(agent);
        seenIds.add(agent.id);
    });

    // Load from KV if available
    if (kv) {
        try {
            const index = await kv.get(KV_INDEX_KEY) || [];
            for (const id of index) {
                if (!seenIds.has(id)) {
                    try {
                        const agent = await getAgent(id);
                        if (agent) {
                            agents.push(agent);
                            seenIds.add(id);
                        }
                    } catch (err) {
                        console.error(`Error loading agent ${id} from KV:`, err);
                    }
                }
            }
        } catch (err) {
            console.warn("Error listing agents from KV:", err);
        }
    }

    // Also check filesystem for any agents not yet loaded (local dev)
    if (fs.existsSync && typeof fs.existsSync === "function") {
        try {
            if (fs.existsSync(AGENTS_DIR)) {
                const files = fs.readdirSync(AGENTS_DIR);
                for (const file of files) {
                    if (file.endsWith(".json")) {
                        const id = file.replace(".json", "");
                        if (!seenIds.has(id)) {
                            try {
                                const agent = await getAgent(id);
                                if (agent) {
                                    agents.push(agent);
                                    seenIds.add(id);
                                }
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

