"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProgressStep = {
    label: string;
    status: "pending" | "active" | "completed" | "error";
};

const STEPS: ProgressStep[] = [
    { label: "Generating wallet", status: "pending" },
    { label: "Configuring agent logic", status: "pending" },
    { label: "Saving agent", status: "pending" },
    { label: "Funding wallet", status: "pending" },
    { label: "Complete", status: "pending" },
];

export default function AgentBuilder() {
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0.001");
    const [loading, setLoading] = useState(false);
    const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(STEPS);
    const router = useRouter();

    const updateStep = (index: number, status: ProgressStep["status"]) => {
        setProgressSteps((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status };
            return updated;
        });
    };

    const handleCreate = async () => {
        setLoading(true);
        setProgressSteps(STEPS.map(s => ({ ...s, status: "pending" as const })));
        let currentStepIndex = -1;

        try {
            // Step 1: Generating wallet
            currentStepIndex = 0;
            updateStep(0, "active");
            await new Promise(resolve => setTimeout(resolve, 300));

            // Step 2: Configuring agent logic
            currentStepIndex = 1;
            updateStep(0, "completed");
            updateStep(1, "active");
            await new Promise(resolve => setTimeout(resolve, 400));

            // Step 3: Saving agent
            currentStepIndex = 2;
            updateStep(1, "completed");
            updateStep(2, "active");

            const res = await fetch("/api/agents/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "New Agent",
                    instructions: description,
                    price
                }),
            });

            updateStep(2, "completed");
            currentStepIndex = 3;
            updateStep(3, "active");
            await new Promise(resolve => setTimeout(resolve, 500));

            const data = await res.json();
            if (data.success) {
                updateStep(3, "completed");
                currentStepIndex = 4;
                updateStep(4, "active");
                await new Promise(resolve => setTimeout(resolve, 300));
                updateStep(4, "completed");

                // Small delay to show completion before redirect
                setTimeout(() => {
                    router.push(`/agents/${data.agent.id}`);
                }, 500);
            } else {
                updateStep(currentStepIndex, "error");
                alert("Error: " + data.error);
                setLoading(false);
            }
        } catch (e) {
            if (currentStepIndex >= 0) {
                updateStep(currentStepIndex, "error");
            }
            alert("Failed to create agent");
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel glass-hover rounded-2xl p-8 text-white max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-300 to-gray-200 text-transparent bg-clip-text">Build Your Agent</h2>

            <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-200">What should this agent do?</label>
                <textarea
                    className="w-full p-4 rounded-lg glass-input text-white placeholder-[#a0aec0]"
                    rows={4}
                    placeholder="e.g. Fetch the price of MON every hour and summarize it..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-200">Price per call (MON)</label>
                <input
                    type="number"
                    step="0.01"
                    className="w-full p-4 rounded-lg glass-input text-white placeholder-[#a0aec0]"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
            </div>

            {loading && (
                <div className="mb-6 space-y-4">
                    <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
                            style={{
                                width: `${(progressSteps.filter(s => s.status === "completed").length / progressSteps.length) * 100}%`
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        {progressSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    step.status === "completed"
                                        ? "bg-green-500"
                                        : step.status === "active"
                                        ? "bg-purple-500 animate-pulse"
                                        : step.status === "error"
                                        ? "bg-red-500"
                                        : "bg-gray-600"
                                }`}>
                                    {step.status === "completed" && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {step.status === "error" && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>
                                <span className={`${
                                    step.status === "active"
                                        ? "text-purple-300 font-medium"
                                        : step.status === "completed"
                                        ? "text-green-300"
                                        : step.status === "error"
                                        ? "text-red-300"
                                        : "text-gray-400"
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full glass-button text-white font-bold py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Generating Agent..." : "Generate Agent"}
            </button>
        </div>
    );
}
