
"use client";

import { useState } from "react";

export default function FlightSearchRunner() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [prompt, setPrompt] = useState("Find flights from SFO to Mexico city");

    const handleRun = async () => {
        setLoading(true);
        setLogs([{ type: "info", content: `Analyzing request: "${prompt}"...` }]);

        try {
            const res = await fetch("/api/agents/flight-search-agent/run", {
                method: "POST",
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();

            if (data.logs) {
                setLogs(data.logs);
            } else {
                setLogs(prev => [...prev, { type: "info", content: "Done." }]);
            }
        } catch (e: any) {
            setLogs(prev => [...prev, { type: "error", content: e.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel glass-hover rounded-2xl p-6 mt-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="font-mono text-xs text-gray-300 mb-2 opacity-80">TEMPLATE AGENT</div>
                    <h3 className="text-xl font-bold text-white">Flight Search Assistant</h3>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-gray-300 text-xs mb-2 font-medium">PROMPT</label>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full glass-input rounded-lg p-3 text-white placeholder-[#a0aec0]"
                    placeholder="Enter your flight search query..."
                />
            </div>

            <button
                onClick={handleRun}
                disabled={loading}
                className="w-full glass-button text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {loading ? "Searching..." : "Search Flights"}
            </button>

            <div className="glass-console p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs text-green-300">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>{" "}
                        <span className={log.type === 'error' ? 'text-red-500' : ''}>
                            {log.step ? `[${log.step}] ` : ""}

                            {/* Display Flight Results Nicely */}
                            {log.result?.flights && (
                                <div className="ml-4 flex flex-col gap-1 mt-1">
                                    {log.result.flights.map((f: any, idx: number) => (
                                        <div key={idx} className="text-gray-300 border-l-2 border-gray-500 pl-2">
                                            {f.airline} | {f.departure} &rarr; {f.arrival} | {f.duration} | <span className="text-white font-bold">{f.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!log.result?.flights && (
                                typeof log.content === 'string' ? log.content : JSON.stringify(log.result || log)
                            )}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && <span className="text-gray-500">Ready to search flights...</span>}
            </div>
        </div>
    );
}
