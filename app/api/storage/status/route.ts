import { NextResponse } from "next/server";
import { listAgents } from "@/lib/storage/agents";

export async function GET() {
    const hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const hasUpstashRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    const hasRedis = hasVercelKV || hasUpstashRedis;

    let kvStatus = "not_configured";
    let kvProvider = "none";
    let kvTestResult = null;

    if (hasVercelKV) {
        kvProvider = "vercel_kv";
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
    } else if (hasUpstashRedis) {
        kvProvider = "upstash_redis";
        try {
            const { Redis } = await import("@upstash/redis");
            const kv = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });
            kvStatus = "configured";
            // Test Redis connection
            try {
                await kv.set("__health_check__", "ok");
                const testValue = await kv.get("__health_check__");
                await kv.del("__health_check__");
                kvTestResult = testValue === "ok" ? "working" : "failed";
            } catch (err: any) {
                kvTestResult = `error: ${err.message}`;
            }
        } catch (err: any) {
            kvStatus = `error: ${err.message}`;
        }
    }

    const agents = await listAgents();

    return NextResponse.json({
        redis: {
            configured: hasRedis,
            provider: kvProvider,
            status: kvStatus,
            test: kvTestResult,
            env: {
                vercel_kv: {
                    hasUrl: !!process.env.KV_REST_API_URL,
                    hasToken: !!process.env.KV_REST_API_TOKEN,
                },
                upstash_redis: {
                    hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
                    hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
                }
            }
        },
        agents: {
            count: agents.length,
            ids: agents.map(a => a.id)
        }
    });
}

