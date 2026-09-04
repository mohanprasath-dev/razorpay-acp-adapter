import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const fraunces = Fraunces({
	subsets: ['latin'],
	variable: '--font-fraunces',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'AgentPay Bridge | ACP Checkout Adapter for AI Buyer Agents',
	description: 'ACP-compliant checkout adapter for autonomous AI buyer agents. Server-authoritative catalog pricing, deterministic guardrails, 30-min inventory soft-holds, and immutable audit trails. Payment rail: Razorpay.',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}>
			<body className="bg-[#FAF9F6] text-[#141210] font-sans antialiased selection:bg-[#0F5E56]/15 selection:text-[#0F5E56] min-h-screen">
				{children}
			</body>
		</html>
	);
}

