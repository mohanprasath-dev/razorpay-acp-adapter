'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	ShieldCheck,
	Activity,
	CreditCard,
	CheckCircle2,
	XCircle,
	ArrowUpRight,
	Terminal,
	Layers,
	Lock,
	RefreshCw,
	Search,
	Filter,
	Clock,
	AlertTriangle,
	ExternalLink,
	Play,
} from 'lucide-react';
import { CheckoutSession, AuditEntry } from '@/lib/types';
import { fetchSessions, fetchGlobalAudit, checkBackendHealth } from '@/lib/api';

export default function DashboardPage() {
	const [sessions, setSessions] = useState<CheckoutSession[]>([]);
	const [auditStream, setAuditStream] = useState<AuditEntry[]>([]);
	const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [filterStatus, setFilterStatus] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

	const loadData = async () => {
		try {
			const [online, sessionList, auditList] = await Promise.all([
				checkBackendHealth(),
				fetchSessions(),
				fetchGlobalAudit(),
			]);
			setIsBackendOnline(online);
			setSessions(sessionList);
			setAuditStream(auditList);
		} catch (err) {
			console.error('Failed to load dashboard data:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
		if (!autoRefresh) return;
		const interval = setInterval(() => {
			loadData();
		}, 4000);
		return () => clearInterval(interval);
	}, [autoRefresh]);

	// Filtered sessions
	const filteredSessions = sessions.filter((s) => {
		const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
		const matchesSearch =
			searchQuery === '' ||
			s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.buyer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.payment_provider?.razorpay_order_id?.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesStatus && matchesSearch;
	});

	// Metrics
	const totalSessions = sessions.length;
	const completedCount = sessions.filter((s) => s.status === 'completed').length;
	const rejectedCount = sessions.filter((s) => s.status === 'rejected').length;
	const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
						<CheckCircle2 className="w-3 h-3" />
						completed
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
						<XCircle className="w-3 h-3" />
						rejected
					</span>
				);
			case 'cancelled':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
						<AlertTriangle className="w-3 h-3" />
						cancelled
					</span>
				);
			case 'updated':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						<RefreshCw className="w-3 h-3" />
						updated
					</span>
				);
			case 'ready_for_payment':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
						<CreditCard className="w-3 h-3" />
						ready
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
						<Clock className="w-3 h-3" />
						{status}
					</span>
				);
		}
	};

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
							Track 01 — AI Growth & Agentic Commerce | Audit Trail Dashboard
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<button
						onClick={() => setAutoRefresh(!autoRefresh)}
						className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
							autoRefresh
								? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
								: 'bg-slate-800/50 border-slate-700 text-slate-400'
						}`}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
						{autoRefresh ? 'Live Polling (4s)' : 'Polling Paused'}
					</button>

					<div
						className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
							isBackendOnline
								? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
								: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
						}`}
					>
						<span
							className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
						></span>
						{isBackendOnline ? 'Backend Online (:8000)' : 'Backend Offline'}
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
						<div className="text-2xl font-bold text-white font-mono">{totalSessions}</div>
						<p className="text-xs text-slate-500 mt-1">Lifecycle executions recorded</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Completed</span>
							<CheckCircle2 className="w-4 h-4 text-emerald-400" />
						</div>
						<div className="text-2xl font-bold text-emerald-400 font-mono">{completedCount}</div>
						<p className="text-xs text-slate-500 mt-1">Razorpay orders created</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Bounded Rejections</span>
							<XCircle className="w-4 h-4 text-rose-400" />
						</div>
						<div className="text-2xl font-bold text-rose-400 font-mono">{rejectedCount}</div>
						<p className="text-xs text-slate-500 mt-1">Gated violations stopped</p>
					</div>

					<div className="p-5 rounded-xl bg-[#11131f] border border-[#1e2238] shadow-sm">
						<div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
							<span>Guardrail Bounds</span>
							<ShieldCheck className="w-4 h-4 text-indigo-400" />
						</div>
						<div className="text-sm font-semibold text-slate-200">Active & Enforced</div>
						<p className="text-xs text-slate-500 mt-1">Deterministic rule engine</p>
					</div>
				</div>

				{/* Two-Column Layout: Sessions Table & ACP Rule Spec */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left: Sessions List (Span 2) */}
					<div className="lg:col-span-2 p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
							<div>
								<h2 className="text-base font-semibold text-white">Checkout Sessions</h2>
								<p className="text-xs text-slate-400">Live agentic checkout sessions across lifecycle</p>
							</div>

							{/* Search & Filter */}
							<div className="flex items-center gap-2">
								<div className="relative">
									<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
									<input
										type="text"
										placeholder="Search sessions..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="bg-slate-900/80 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
									/>
								</div>
							</div>
						</div>

						{/* Status Filters */}
						<div className="flex flex-wrap gap-1.5 text-xs">
							{['all', 'completed', 'rejected', 'updated', 'created', 'cancelled'].map((status) => (
								<button
									key={status}
									onClick={() => setFilterStatus(status)}
									className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
										filterStatus === status
											? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
											: 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
									}`}
								>
									{status}
								</button>
							))}
						</div>

						{/* Sessions Table */}
						{filteredSessions.length === 0 ? (
							<div className="py-14 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
								<Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
								<p className="text-sm font-medium">No checkout sessions found.</p>
								<p className="text-xs text-slate-600 max-w-sm">
									Run <code className="text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">python buyer_agent_sim.py</code> to execute the buyer agent simulation.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-slate-800/80 text-slate-400 font-mono uppercase">
											<th className="py-3 px-3">Session ID</th>
											<th className="py-3 px-3">Status</th>
											<th className="py-3 px-3">Buyer</th>
											<th className="py-3 px-3">Total</th>
											<th className="py-3 px-3">Razorpay Order</th>
											<th className="py-3 px-3 text-right">Audit Trail</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-800/40">
										{filteredSessions.map((s) => (
											<tr key={s.id} className="hover:bg-slate-800/20 transition-colors group">
												<td className="py-3.5 px-3 font-mono font-medium text-blue-400">
													<Link href={`/dashboard/${s.id}`} className="hover:underline flex items-center gap-1">
														{s.id}
													</Link>
												</td>
												<td className="py-3.5 px-3">{getStatusBadge(s.status)}</td>
												<td className="py-3.5 px-3 text-slate-300">
													{s.buyer?.email || <span className="text-slate-600 italic">—</span>}
												</td>
												<td className="py-3.5 px-3 font-mono font-medium text-slate-200">
													₹{s.totals?.total?.toFixed(2) || '0.00'}
												</td>
												<td className="py-3.5 px-3 font-mono text-slate-400">
													{s.payment_provider?.razorpay_order_id ? (
														<span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
															{s.payment_provider.razorpay_order_id}
														</span>
													) : (
														<span className="text-slate-600 italic">unassigned</span>
													)}
												</td>
												<td className="py-3.5 px-3 text-right">
													<Link
														href={`/dashboard/${s.id}`}
														className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] border border-slate-700/50"
													>
														Inspect
														<ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
													</Link>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Right Column: ACP Guardrails & Live Global Stream */}
					<div className="space-y-6">
						{/* Guardrail Policy Overview */}
						<div className="p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-4">
							<h2 className="text-base font-semibold text-white flex items-center gap-2">
								<Lock className="w-4 h-4 text-blue-400" />
								ACP Guardrail Rules
							</h2>
							<p className="text-xs text-slate-400">Deterministic bounds checked before state transition</p>

							<div className="space-y-2.5 text-xs">
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
									<span className="font-mono text-amber-400 font-semibold">Enforced & Cached</span>
								</div>
							</div>

							<div className="pt-3 border-t border-slate-800/80">
								<a
									href="http://localhost:8000/.well-known/agent.json"
									target="_blank"
									rel="noreferrer"
									className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-between group"
								>
									<span>Capability Feed (/.well-known/agent.json)</span>
									<ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
								</a>
							</div>
						</div>

						{/* Live Audit Stream Card */}
						<div className="p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-4">
							<div className="flex items-center justify-between pb-3 border-b border-slate-800">
								<div>
									<h3 className="text-sm font-semibold text-white flex items-center gap-2">
										<ShieldCheck className="w-4 h-4 text-indigo-400" />
										Live Audit Feed
									</h3>
									<p className="text-[11px] text-slate-400">Recent Firestore state transitions</p>
								</div>
								<span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/60">
									/audit_entries
								</span>
							</div>

							{auditStream.length === 0 ? (
								<p className="text-xs text-slate-500 italic py-4 text-center">No audit entries logged yet.</p>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-800/40 text-xs">
									{auditStream.slice(-6).reverse().map((entry) => {
										const isReject = entry.action === 'reject';
										return (
											<div key={entry.id} className="pt-2.5 first:pt-0 space-y-1">
												<div className="flex items-center justify-between">
													<Link
														href={`/dashboard/${entry.session_id}`}
														className="font-mono text-blue-400 hover:underline text-[11px] truncate max-w-[140px]"
													>
														{entry.session_id}
													</Link>
													<span
														className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
															isReject
																? 'bg-rose-500/20 text-rose-300'
																: entry.action === 'complete'
																? 'bg-emerald-500/20 text-emerald-300'
																: 'bg-blue-500/20 text-blue-300'
														}`}
													>
														{entry.action}
													</span>
												</div>

												{isReject && entry.reason && (
													<p className="text-[11px] text-rose-300 font-mono bg-rose-950/30 border border-rose-500/20 p-2 rounded">
														{entry.reason}
													</p>
												)}

												<div className="flex justify-between text-[10px] text-slate-500 font-mono">
													<span>Actor: {entry.actor}</span>
													<span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
