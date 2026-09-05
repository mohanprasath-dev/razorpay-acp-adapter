'use client';

import React, { useState } from 'react';
import {
	HelpCircle,
	ChevronDown,
	ChevronUp,
	Copy,
	Check,
	Terminal,
	ShieldCheck,
	Play,
	Sparkles,
	ExternalLink
} from 'lucide-react';

interface JudgeGuideCardProps {
	liveBackendUrl?: string;
}

export default function JudgeGuideCard({
	liveBackendUrl = 'https://razorpay-acp-adapter-922729192321.asia-south1.run.app'
}: JudgeGuideCardProps) {
	const [isOpen, setIsOpen] = useState(true);
	const [copied, setCopied] = useState(false);

	const simCommand = `python buyer_agent_sim.py --base-url ${liveBackendUrl}`;

	const handleCopy = () => {
		navigator.clipboard.writeText(simCommand);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="rounded-2xl bg-white border border-[#C5D8D4] shadow-bridge overflow-hidden transition-all">
			{/* Card Header & Toggle */}
			<div
				onClick={() => setIsOpen(!isOpen)}
				className="p-4 sm:p-5 bg-gradient-to-r from-[#F4F1EC] to-white border-b border-[#E8E5DF] flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F4F1EC]/80 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-xl bg-[#0F5E56] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
						<HelpCircle className="w-4 h-4 text-white" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-sm font-bold text-[#141210]">
								Judge &amp; Evaluator Testing Guide
							</h2>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-bold">
								60-Sec Read
							</span>
						</div>
						<p className="text-xs text-[#5C5852] mt-0.5">
							How to test this live demo with 1-click or from the terminal.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-[#0F5E56] hidden sm:inline">
						{isOpen ? 'Collapse Guide' : 'Expand Guide'}
					</span>
					<button
						type="button"
						aria-label={isOpen ? 'Collapse guide' : 'Expand guide'}
						className="p-1.5 rounded-lg border border-[#E8E5DF] bg-white text-[#5C5852] hover:text-[#141210]"
					>
						{isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</button>
				</div>
			</div>

			{/* Collapsible Body */}
			{isOpen && (
				<div className="p-5 sm:p-6 space-y-6 text-xs text-[#5C5852] leading-relaxed">
					{/* 1-2 Line Explanation */}
					<div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] text-[#141210]">
						<p className="text-xs leading-relaxed font-normal">
							<strong className="font-bold text-[#0F5E56]">What this project does: </strong>
							AgentPay Bridge is a checkout safety adapter for autonomous AI buyer agents. It translates agent purchasing intents into verified orders on the Razorpay rail while mathematically enforcing server catalog prices, 50% discount caps, 30-min inventory holds, and tamper-proof audit trails.
						</p>
					</div>

					{/* 2 Ways to Test */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Option A: Zero Terminal */}
						<div className="p-4 rounded-xl border border-[#C5D8D4] bg-[#E6F0EE]/40 space-y-2.5">
							<div className="flex items-center gap-2 text-xs font-bold text-[#0F5E56]">
								<Play className="w-3.5 h-3.5 fill-current" />
								<span>OPTION A: 1-Click Frontend Testing (Fastest)</span>
							</div>
							<p className="text-[11px] text-[#383531]">
								You don&apos;t need a terminal! Use the buttons in the action bar above:
							</p>
							<ul className="space-y-1.5 text-[11px] text-[#141210]">
								<li className="flex items-center gap-1.5">
									<span className="font-bold text-[#0F5E56]">▶ Happy Path:</span> Creates a session and creates a live Razorpay test order.
								</li>
								<li className="flex items-center gap-1.5">
									<span className="font-bold text-[#C4602A]">🛡 Test Attack:</span> Dispatches rogue agent with 75% discount; stops the breach.
								</li>
								<li className="flex items-center gap-1.5">
									<span className="font-bold text-[#5C5852]">⚡ Idempotency:</span> Replays identical token; returns cached session without double charges.
								</li>
							</ul>
						</div>

						{/* Option B: Terminal Command */}
						<div className="p-4 rounded-xl border border-[#E8E5DF] bg-[#121817] text-[#E2DED7] space-y-2.5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-xs font-mono font-bold text-[#A3E0D8]">
									<Terminal className="w-3.5 h-3.5 text-[#A3E0D8]" />
									<span>OPTION B: Terminal Simulator Command</span>
								</div>
								<button
									onClick={handleCopy}
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E2625] hover:bg-[#283231] text-[10px] text-white border border-[#2E3A38] transition-colors"
								>
									{copied ? (
										<>
											<Check className="w-3 h-3 text-[#34D399]" />
											<span>Copied</span>
										</>
									) : (
										<>
											<Copy className="w-3 h-3 text-[#E2DED7]" />
											<span>Copy</span>
										</>
									)}
								</button>
							</div>
							<p className="text-[11px] text-[#8C8880]">
								Run the headless buyer agent directly against the live Cloud Run backend:
							</p>
							<div className="p-2.5 rounded bg-[#0A0D0C] border border-[#242E2D] font-mono text-[11px] text-[#34D399] break-all select-all">
								{simCommand}
							</div>
						</div>
					</div>

					{/* What each Act demonstrates */}
					<div className="space-y-3 pt-1">
						<h3 className="font-mono text-[11px] uppercase tracking-wider text-[#141210] font-bold">
							What Each Simulator Act Demonstrates &amp; What to Look For
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E8E5DF] space-y-1">
								<div className="font-bold text-[#0F5E56] font-mono text-xs">ACT 1: Discovery</div>
								<p className="text-[11px] text-[#5C5852]">
									Agent resolves merchant capabilities at <code className="font-mono text-[#141210]">/.well-known/agent.json</code> and retrieves the 5-SKU catalog.
								</p>
							</div>

							<div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E8E5DF] space-y-1">
								<div className="font-bold text-[#0F5E56] font-mono text-xs">ACT 2: Happy Path</div>
								<p className="text-[11px] text-[#5C5852]">
									Agent buys items, reserves stock, and settles on Razorpay.
								</p>
								<div className="text-[10px] font-semibold text-[#0F5E56] pt-1">
									✦ Look for: New green &ldquo;completed&rdquo; row with a real Razorpay Order ID.
								</div>
							</div>

							<div className="p-3 rounded-lg bg-[#F9ECE5] border border-[#E8C2AF] space-y-1">
								<div className="font-bold text-[#C4602A] font-mono text-xs">ACT 3: Attack Suite</div>
								<p className="text-[11px] text-[#5C5852]">
									Malicious agent attempts a ₹1 price override and 75% discount.
								</p>
								<div className="text-[10px] font-bold text-[#C4602A] pt-1">
									⚠️ Expected: Shows &ldquo;rejected&rdquo;. This is correct defense behavior, not a bug!
								</div>
							</div>

							<div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E8E5DF] space-y-1">
								<div className="font-bold text-[#0F5E56] font-mono text-xs">ACT 4: Resilience</div>
								<p className="text-[11px] text-[#5C5852]">
									Tests duplicate request idempotency, cancellation, and Razorpay refund.
								</p>
								<div className="text-[10px] font-semibold text-[#141210] pt-1">
									✦ Look for: &ldquo;cancelled&rdquo; and &ldquo;refunded&rdquo; terminal state rows.
								</div>
							</div>
						</div>
					</div>

					{/* What Dashboard Shows On Its Own */}
					<div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px]">
						<div>
							<strong className="text-[#141210]">No simulator run? </strong>
							The dashboard displays real-time metrics, recent state transitions, and audit records automatically. Click any session row in the table below to inspect its itemized GST math and immutable Firestore audit trail.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
