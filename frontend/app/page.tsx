'use client';

import React from 'react';
import {
	ShieldCheck,
	Activity,
	CreditCard,
	CheckCircle2,
	XCircle,
	ArrowUpRight,
	Terminal,
	Layers,
	Lock
} from 'lucide-react';

export default function DashboardPage() {
	return (
		<div className="min-h-screen bg-[#090a0f] text-slate-100 p-6 md:p-10 font-sans">
			{/* Top Navigation */}
			<header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800/80 gap-4">
				<div className="flex items-center space-x-4">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
						<Layers className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
							Razorpay ACP Adapter
							<span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
								v2026-04-17
							</span>
						</h1>
						<p className="text-xs text-slate-400 font-mono">
							Track 01 — AI Growth & Agentic Commerce | TaskDrift
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
						<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
						Backend Online (:8000)
					</div>
					<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
						<CreditCard className="w-3.5 h-3.5" />
						Razorpay Test Rail
					</div>
				</div>
			</header>

			{/* Main Grid */}
			<main className="max-w-7xl mx-auto pt-8 space-y-8">
				{/* Metrics Row */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Total Sessions</span>
							<Activity className="w-4 h-4 text-blue-400" />
						</div>
						<div className="text-2xl font-bold text-white">0</div>
						<p className="text-xs text-slate-500 mt-1">Lifecycle executions</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Completed</span>
							<CheckCircle2 className="w-4 h-4 text-emerald-400" />
						</div>
						<div className="text-2xl font-bold text-emerald-400">0</div>
						<p className="text-xs text-slate-500 mt-1">Razorpay orders created</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Bounded Rejections</span>
							<XCircle className="w-4 h-4 text-rose-400" />
						</div>
						<div className="text-2xl font-bold text-rose-400">0</div>
						<p className="text-xs text-slate-500 mt-1">Gated violations stopped</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Guardrail Bounds</span>
							<ShieldCheck className="w-4 h-4 text-indigo-400" />
						</div>
						<div className="text-sm font-semibold text-slate-200">Active & Enforced</div>
						<p className="text-xs text-slate-500 mt-1">Hard rule engine</p>
					</div>
				</div>

				{/* Two-Column Section: Audit Log & Protocol State */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Audit Stream Table */}
					<div className="lg:col-span-2 p-6 rounded-xl bg-[#11131f] border border-[#1e2238]">
						<div className="flex items-center justify-between pb-4 border-b border-slate-800">
							<div>
								<h2 className="text-base font-semibold text-white">Live Audit Trail</h2>
								<p className="text-xs text-slate-400">Immutable Firestore state transition stream</p>
							</div>
							<span className="text-xs font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/60">
								collection: /audit_entries
							</span>
						</div>

						<div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
							<Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
							<p className="text-sm">No checkout sessions recorded yet.</p>
							<p className="text-xs text-slate-600 max-w-sm">
								Run the scripted buyer agent simulator or hit <code className="text-slate-400">POST /checkout_sessions</code> to generate live audit logs.
							</p>
						</div>
					</div>

					{/* Protocol Spec & Capabilities */}
					<div className="p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-6">
						<div>
							<h2 className="text-base font-semibold text-white flex items-center gap-2">
								<Lock className="w-4 h-4 text-blue-400" />
								ACP Guardrails
							</h2>
							<p className="text-xs text-slate-400">Bounded & gated rule criteria</p>
						</div>

						<div className="space-y-3 text-xs">
							<div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
								<span className="text-slate-300">Max Discount Allowed</span>
								<span className="font-mono text-emerald-400 font-semibold">50%</span>
							</div>
							<div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
								<span className="text-slate-300">Max Single Order Value</span>
								<span className="font-mono text-blue-400 font-semibold">₹50,000</span>
							</div>
							<div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
								<span className="text-slate-300">Max Quantity / Line Item</span>
								<span className="font-mono text-purple-400 font-semibold">10 units</span>
							</div>
							<div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
								<span className="text-slate-300">Idempotency-Key Header</span>
								<span className="font-mono text-amber-400 font-semibold">Enforced</span>
							</div>
						</div>

						<div className="pt-4 border-t border-slate-800/80">
							<a
								href="/products"
								target="_blank"
								rel="noreferrer"
								className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-between group"
							>
								<span>View Capability Feed (agent.json)</span>
								<ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
							</a>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
