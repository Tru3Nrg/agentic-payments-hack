import type { Metadata } from "next";
import { ThirdwebProvider } from "thirdweb/react";
import "./globals.css";
import { LiquidBackground } from "@/components/LiquidBackground";

export const metadata: Metadata = {
    title: "Build-Your-Own-Agent",
    description: "Monad x Thirdweb x x402 Hackathon Project",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <ThirdwebProvider>
                    <LiquidBackground />
                    <div className="relative z-10">
                        {children}
                    </div>
                </ThirdwebProvider>
            </body>
        </html>
    );
}
