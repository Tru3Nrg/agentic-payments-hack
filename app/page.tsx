import AgentBuilder from "@/components/AgentBuilder";
import OpenSourceFunderRunner from "@/components/OpenSourceFunderRunner";
import FlightSearchRunner from "@/components/FlightSearchRunner";
import AutoItemBuyerRunner from "@/components/AutoItemBuyerRunner";
import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">

            <div className="relative z-10 w-full max-w-6xl">
                <div className="text-center mb-10 glass-panel rounded-2xl p-8 glass-hover">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 via-gray-200 to-purple-300 text-transparent bg-clip-text animate-pulse">
                        Build-Your-Own-Agent
                    </h1>
                    <p className="text-xl text-gray-200">
                        Monad Testnet • Thirdweb • x402
                    </p>
                </div>

                {/* Game Asset Buying Agent - Moved to top */}
                <div className="w-full max-w-2xl mx-auto text-left glass-panel rounded-2xl p-8 glass-hover mb-12">
                    <h2 className="text-2xl font-bold mb-4 text-purple-300">🎮 Game Asset Buyer</h2>
                    <p className="text-gray-400 mb-4">
                        Automatically purchases items from the game store using MON via x402 payments. The agent handles the entire payment flow for you.
                    </p>
                    <AutoItemBuyerRunner />
                </div>

                <div className="w-full max-w-2xl mx-auto text-left glass-panel rounded-2xl p-8 glass-hover">
                    <h2 className="text-2xl font-bold mb-4 text-purple-300">Featured Agents</h2>

                <div className="mb-8">
                    <p className="text-gray-400 mb-4">
                        Automatically scans GitHub repos and funds those that accept crypto on Monad Testnet.
                    </p>
                    <OpenSourceFunderRunner />
                </div>

                <div>
                    <p className="text-gray-400 mb-4">
                        Finds the best flight deals for your next conference.
                    </p>
                    <FlightSearchRunner />
                </div>
                </div>

                <div className="w-full max-w-2xl mx-auto mt-12 text-center">
                    <Link
                        href="/agents"
                        className="glass-button text-white font-bold py-4 px-8 rounded-lg transition-all inline-block text-lg hover:scale-105"
                    >
                        View All Agents →
                    </Link>
                </div>

                {/* Build Your Own Agent - At the bottom */}
                <div className="w-full max-w-2xl mx-auto mt-12">
                    <AgentBuilder />
                </div>
            </div>
        </div>
    );
}
