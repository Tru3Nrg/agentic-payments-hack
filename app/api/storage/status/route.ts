import { NextResponse } from "next/server";
import { listAgents } from "@/lib/storage/agents";

export async function GET() {
    const hasKVEnv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

    let kvStatus = "not_configured";
    let kvTestResult = null;

    if (hasKVEnv) {
        try {
            const { kv } = await import("@vercel/kv");
            if (kv) {
                kvStatus = "configured";
                // Test KV connection
                try {
                    await kv.set("__health_check__", "ok");
                    const testValue = await kv.get("__health_check__");
                    await kv.del("__health_check__");
                    kvTestResult = testValue === "ok" ? "working" : "failed";
                } catch (err: any) {
                    kvTestResult = `error: ${err.message}`;
                }
            }
        } catch (err: any) {
            kvStatus = `error: ${err.message}`;
        }
    }

    const agents = await listAgents();

    return NextResponse.json({
        kv: {
            configured: hasKVEnv,
            status: kvStatus,
            test: kvTestResult,
            env: {
                hasUrl: !!process.env.KV_REST_API_URL,
                hasToken: !!process.env.KV_REST_API_TOKEN,
            }
        },
        agents: {
            count: agents.length,
            ids: agents.map(a => a.id)
        }
    });
}

