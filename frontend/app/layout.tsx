import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Razorpay ACP Checkout Adapter | Audit Dashboard',
	description: 'Live Agentic Commerce Protocol (ACP) session monitor and explainable audit trail powered by Razorpay.',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className="bg-[#090a0f] text-slate-100 antialiased selection:bg-blue-500/30 selection:text-blue-200">
				{children}
			</body>
		</html>
	);
}
