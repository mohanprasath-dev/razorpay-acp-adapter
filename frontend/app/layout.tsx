import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Razorpay ACP Checkout Adapter | Autonomous AI Commerce Rail',
	description: 'Spec-compliant Agentic Commerce Protocol (ACP v2026-04-17) financial safety rail backed by Razorpay. Zero-hallucination catalog pricing, deterministic guardrails, and immutable audit trails.',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="bg-[#f8fafc] text-[#0b192c] antialiased selection:bg-blue-500/20 selection:text-blue-700 min-h-screen">
				{children}
			</body>
		</html>
	);
}
