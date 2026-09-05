'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
	Play,
	ShieldAlert,
	CheckCircle2,
	XCircle,
	Terminal,
	ArrowRight,
	RefreshCw,
	Zap,
	X,
	ExternalLink,
	ShieldCheck,
	CreditCard,
	Layers,
} from 'lucide-react';
import {
	SimStepLog,
	SimResult,
	runHappyPathDemo,
	runViolationDemo,
	runIdempotencyDemo,
} from '@/lib/demoSimulator';

interface TryDemoModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSessionCreated?: (sessionId: string) => void;
}

export default function TryDemoModal({ isOpen, onClose, onSessionCreated }: TryDemoModalProps) {
	const [activeScenario, setActiveScenario] = useState<'happy_path' | 'violation' | 'idempotency'>('happy_path');
	const [isRunning, setIsRunning] = useState(false);
	const [logs, setLogs] = useState<SimStepLog[]>([]);
	const [simResult, setSimResult] = useState<SimResult | null>(null);

	if (!isOpen) return null;

	const handleRun = async (scenario = activeScenario) => {
		setIsRunning(true);
		setLogs([]);
		setSimResult(null);

		const handleLog = (log: SimStepLog) => {
			setLogs((prev) => {
				const existingIndex = prev.findIndex((p) => p.id === log.id);
				if (existingIndex >= 0) {
					const copy = [...prev];
					copy[existingIndex] = log;
					return copy;
				}
				return [...prev, log];
			});
		};

		let result: SimResult;
		if (scenario === 'happy_path') {
			result = await runHappyPathDemo(handleLog, 400);
		} else if (scenario === 'violation') {
			result = await runViolationDemo(handleLog, 400);
		} else {
			result = await runIdempotencyDemo(handleLog, 400);
		}

		setSimResult(result);
		setIsRunning(false);

		if (result.sessionId && onSessionCreated) {
			onSessionCreated(result.sessionId);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#141210]/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FAF9F6] border border-[#E8E5DF] shadow-2xl overflow-hidden font-sans text-[#141210]">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E5DF] bg-white">
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-[#0F5E56] flex items-center justify-center text-white shadow-sm">
							<Zap className="w-4 h-4 text-white" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-serif font-bold text-[#141210]">
									Interactive Protocol Simulator
								</h2>
								<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] font-semibold border border-[#C5D8D4]">
									Live Test Runner
								</span>
							</div>
							<p className="text-xs text-[#5C5852]">
								Run autonomous AI buyer agent transactions against the Razorpay ACP adapter in real-time.
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-[#5C5852] hover:text-[#141210] hover:bg-[#F4F1EC] transition-colors"
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Scenario Selector Tabs */}
				<div className="px-6 py-3 border-b border-[#E8E5DF] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F4F1EC] border border-[#E8E5DF] text-xs font-medium">
						<button
							onClick={() => {
								setActiveScenario('happy_path');
								setSimResult(null);
								setLogs([]);
							}}
							disabled={isRunning}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
								activeScenario === 'happy_path'
									? 'bg-white text-[#0F5E56] font-semibold shadow-sm'
									: 'text-[#5C5852] hover:text-[#141210]'
							}`}
						>
							<CheckCircle2 className="w-3.5 h-3.5 text-[#0F5E56]" />
							<span>1. Happy Path Order</span>
						</button>

						<button
							onClick={() => {
								setActiveScenario('violation');
								setSimResult(null);
								setLogs([]);
							}}
							disabled={isRunning}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
								activeScenario === 'violation'
									? 'bg-white text-[#C4602A] font-semibold shadow-sm'
									: 'text-[#5C5852] hover:text-[#141210]'
							}`}
						>
							<ShieldAlert className="w-3.5 h-3.5 text-[#C4602A]" />
							<span>2. Attack &amp; Guardrails</span>
						</button>

						<button
							onClick={() => {
								setActiveScenario('idempotency');
								setSimResult(null);
								setLogs([]);
							}}
							disabled={isRunning}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
								activeScenario === 'idempotency'
									? 'bg-white text-[#141210] font-semibold shadow-sm'
									: 'text-[#5C5852] hover:text-[#141210]'
							}`}
						>
							<RefreshCw className="w-3.5 h-3.5 text-[#5C5852]" />
							<span>3. Idempotency Replay</span>
						</button>
					</div>

					<button
						onClick={() => handleRun()}
						disabled={isRunning}
						className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${
							isRunning
								? 'bg-[#8C8880] cursor-not-allowed'
								: activeScenario === 'violation'
								? 'bg-[#C4602A] hover:bg-[#A84E1E]'
								: 'bg-[#0F5E56] hover:bg-[#09433D]'
						}`}
					>
						{isRunning ? (
							<>
								<RefreshCw className="w-3.5 h-3.5 animate-spin" />
								<span>Simulating...</span>
							</>
						) : (
							<>
								<Play className="w-3.5 h-3.5 fill-current" />
								<span>Run Test Scenario</span>
							</>
						)}
					</button>
				</div>

				{/* Scenario Description Banner */}
				<div className="px-6 py-2.5 bg-white border-b border-[#E8E5DF] text-xs text-[#5C5852]">
					{activeScenario === 'happy_path' && (
						<p>
							<strong className="text-[#141210]">Scenario 1:</strong> Simulates an autonomous buyer agent discovering catalog SKUs, creating a session, modifying cart quantities, calculating 18% GST, and completing a live test-mode order with <strong>Razorpay Orders API</strong>.
						</p>
					)}
					{activeScenario === 'violation' && (
						<p>
							<strong className="text-[#141210]">Scenario 2:</strong> Simulates rogue attacks: (A) Client attempts ₹1.00 unit price tampering on a ₹499 SKU (disregarded by server authority); (B) Agent requests 75% discount (rejected by 50% ceiling with plain-English explainability reason); (C) Graceful self-recovery.
						</p>
					)}
					{activeScenario === 'idempotency' && (
						<p>
							<strong className="text-[#141210]">Scenario 3:</strong> Simulates network retry by submitting the same <code>Idempotency-Key</code> multiple times. Verifies 0 duplicate orders created, tests terminal state locking, and executes the 30-min inventory soft-hold sweeper.
						</p>
					)}
				</div>

				{/* Live Output & Logs Section */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAF9F6]">
					{logs.length === 0 && !isRunning ? (
						<div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
							<div className="w-12 h-12 rounded-2xl bg-[#E6F0EE] border border-[#C5D8D4] flex items-center justify-center text-[#0F5E56]">
								<Terminal className="w-6 h-6" />
							</div>
							<div className="space-y-1">
								<h3 className="text-sm font-bold text-[#141210]">Ready for Live Execution</h3>
								<p className="text-xs text-[#5C5852] max-w-md">
									Click <strong className="text-[#0F5E56]">Run Test Scenario</strong> above. The simulator will make real HTTP calls to the ACP adapter endpoints and stream every state transition in real-time.
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-3 font-mono text-xs">
							{logs.map((log) => (
								<div
									key={log.id}
									className="p-3.5 rounded-xl bg-white border border-[#E8E5DF] shadow-sm space-y-2 animate-in fade-in duration-150"
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="px-2 py-0.5 rounded bg-[#F4F1EC] text-[#141210] font-bold text-[11px]">
												{log.act}
											</span>
											<span className="font-sans font-bold text-[#141210] text-xs">
												{log.title}
											</span>
										</div>
										<div className="flex items-center gap-2 text-[11px]">
											<span className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E8E5DF] text-[#5C5852]">
												{log.method} {log.endpoint.replace(/.*(?=\/(checkout_sessions|products|internal))/, '')}
											</span>
											{log.status === 'running' && (
												<span className="inline-flex items-center gap-1 text-[#0F5E56]">
													<RefreshCw className="w-3 h-3 animate-spin" />
													<span>executing</span>
												</span>
											)}
											{log.status === 'success' && (
												<span className="px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] font-bold">
													{log.statusCode || 200} OK
												</span>
											)}
											{log.status === 'rejected' && (
												<span className="px-2 py-0.5 rounded bg-[#F9ECE5] text-[#C4602A] font-bold">
													{log.statusCode || 400} REJECTED
												</span>
											)}
										</div>
									</div>

									<p className="font-sans text-[11px] text-[#5C5852] leading-relaxed">
										{log.details}
									</p>

									{log.response && (
										<div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E8E5DF] text-[10px] text-[#141210] overflow-x-auto">
											<pre>{JSON.stringify(log.response, null, 2)}</pre>
										</div>
									)}
								</div>
							))}

							{isRunning && (
								<div className="p-3 rounded-xl bg-[#E6F0EE]/50 border border-[#C5D8D4] flex items-center gap-2 text-xs font-sans text-[#0F5E56]">
									<RefreshCw className="w-3.5 h-3.5 animate-spin" />
									<span>Processing ACP protocol turn with server-authoritative math...</span>
								</div>
							)}
						</div>
					)}

					{/* Final Results Banner */}
					{simResult && (
						<div
							className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
								simResult.success
									? 'bg-[#E6F0EE] border-[#C5D8D4] text-[#0F5E56]'
									: 'bg-[#F9ECE5] border-[#E8C2AF] text-[#C4602A]'
							}`}
						>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-[#0F5E56]" />
									<span className="font-bold text-xs font-sans">
										Scenario Completed Successfully
									</span>
								</div>
								<p className="text-xs font-sans text-[#141210]">
									{simResult.summary}
								</p>
							</div>

							<div className="flex items-center gap-2 flex-shrink-0">
								<Link
									href="/dashboard"
									onClick={onClose}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F5E56] hover:bg-[#09433D] text-white text-xs font-semibold shadow-sm transition-all"
								>
									<span>View in Dashboard</span>
									<ArrowRight className="w-3.5 h-3.5" />
								</Link>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="px-6 py-3 border-t border-[#E8E5DF] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C5852]">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5 text-[#0F5E56]" />
							Server-Authoritative
						</span>
						<span>•</span>
						<span className="flex items-center gap-1">
							<CreditCard className="w-3.5 h-3.5 text-[#0F5E56]" />
							Payment Rail: Razorpay
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={onClose}
							className="px-3 py-1.5 rounded-lg border border-[#E8E5DF] bg-white hover:bg-[#F4F1EC] text-[#141210] font-medium transition-all"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
