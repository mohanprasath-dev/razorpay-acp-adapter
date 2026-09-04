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
	Home,
	ArrowLeft,
} from 'lucide-react';
import { CheckoutSession, AuditEntry } from '@/lib/types';
import { fetchSessions, fetchGlobalAudit, checkBackendHealth, API_BASE_URL } from '@/lib/api';

export default function DashboardPage() {
	const [sessions, setSessions] = useState<CheckoutSession[]>([]);
	const [auditStream, setAuditStream] = useState<AuditEntry[]>([]);
	const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [filterStatus, setFilterStatus] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
	const [recentSessionIds, setRecentSessionIds] = useState<Set<string>>(new Set());

	const loadData = async () => {
		try {
			const [online, sessionList, auditList] = await Promise.all([
				checkBackendHealth(),
				fetchSessions(),
				fetchGlobalAudit(),
			]);
			setIsBackendOnline(online);
			setSessions((prevSessions) => {
				const prevIds = new Set(prevSessions.map((s) => s.id));
				const newIds = new Set<string>();
				sessionList.forEach((s) => {
					if (!prevIds.has(s.id) || prevSessions.find((p) => p.id === s.id && p.updated_at !== s.updated_at)) {
						newIds.add(s.id);
					}
				});
				if (newIds.size > 0 && prevSessions.length > 0) {
					setRecentSessionIds(newIds);
					setTimeout(() => setRecentSessionIds(new Set()), 3000);
				}
				return sessionList;
			});
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
		}, 2000);
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
	const refundedCount = sessions.filter((s) => s.status === 'refunded').length;

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
						<CheckCircle2 className="w-3 h-3 text-emerald-600" />
						completed
					</span>
				);
			case 'refunded':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
						<RefreshCw className="w-3 h-3 text-purple-600" />
						refunded
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
						<XCircle className="w-3 h-3 text-rose-600" />
						rejected
					</span>
				);
			case 'cancelled':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
						<AlertTriangle className="w-3 h-3 text-amber-600" />
						cancelled
					</span>
				);
			case 'updated':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
						<RefreshCw className="w-3 h-3 text-indigo-600" />
						updated
					</span>
				);
			case 'ready_for_payment':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0c66e4] border border-blue-200">
						<CreditCard className="w-3 h-3 text-[#0c66e4]" />
						ready
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
						<Clock className="w-3 h-3" />
						{status}
					</span>
				);
		}
	};

	return (
		<div className="min-h-screen bg-[#f8fafc] text-[#0b192c] p-6 md:p-10 font-sans selection:bg-blue-500/20 selection:text-blue-700">
			{/* Top Navigation */}
			<header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-200 gap-4">
				<div className="flex items-center space-x-4">
					<div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0c66e4] to-[#00baf2] flex items-center justify-center shadow-md shadow-blue-500/20">
						<Layers className="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-extrabold tracking-tight text-[#0b192c] flex items-center gap-2.5">
							Razorpay ACP Adapter
							<span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0c66e4] border border-blue-200 font-bold">
								v2026-04-17
							</span>
						</h1>
						<p className="text-xs text-slate-500 font-medium">
							Track 01 — AI Growth & Agentic Commerce | Live Operator Audit Dashboard
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Link
						href="/"
						className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:scale-105"
					>
						<Home className="w-3.5 h-3.5 text-[#0c66e4]" />
						<span>Landing Page</span>
					</Link>

					<button
						onClick={() => setAutoRefresh(!autoRefresh)}
						className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm transition-all ${
							autoRefresh
								? 'bg-blue-50 border-blue-200 text-[#0c66e4]'
								: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
						{autoRefresh ? 'Live Polling (2s)' : 'Polling Paused'}
					</button>

					<div
						className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm ${
							isBackendOnline
								? 'bg-emerald-50 border-emerald-200 text-emerald-700'
								: 'bg-rose-50 border-rose-200 text-rose-700'
						}`}
					>
						<span
							className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
						></span>
						{isBackendOnline ? 'Backend Rail Live' : 'Backend Offline'}
					</div>

					<div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[#0c66e4] text-xs font-semibold shadow-sm">
						<CreditCard className="w-3.5 h-3.5" />
						Razorpay Test Gateway
					</div>
				</div>
			</header>

			{/* Main Grid */}
			<main className="max-w-7xl mx-auto pt-8 space-y-8">
				{/* Metrics Row */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
						<div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold uppercase tracking-wider mb-2">
							<span>Total Sessions</span>
							<Activity className="w-4 h-4 text-[#0c66e4]" />
						</div>
						<div className="text-2xl font-extrabold text-[#0b192c] font-mono">{totalSessions}</div>
						<p className="text-xs text-slate-500 mt-1 font-medium">Lifecycle executions recorded</p>
					</div>

					<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
						<div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold uppercase tracking-wider mb-2">
							<span>Completed</span>
							<CheckCircle2 className="w-4 h-4 text-emerald-600" />
						</div>
						<div className="text-2xl font-extrabold text-[#059669] font-mono">{completedCount}</div>
						<p className="text-xs text-slate-500 mt-1 font-medium">Razorpay orders created</p>
					</div>

					<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
						<div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold uppercase tracking-wider mb-2">
							<span>Bounded Rejections</span>
							<XCircle className="w-4 h-4 text-rose-600" />
						</div>
						<div className="text-2xl font-extrabold text-rose-600 font-mono">{rejectedCount}</div>
						<p className="text-xs text-slate-500 mt-1 font-medium">Gated violations stopped</p>
					</div>

					<div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
						<div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold uppercase tracking-wider mb-2">
							<span>Guardrail Bounds</span>
							<ShieldCheck className="w-4 h-4 text-[#7c3aed]" />
						</div>
						<div className="text-sm font-bold text-slate-800">Active & Enforced</div>
						<p className="text-xs text-slate-500 mt-1 font-medium">Deterministic rule engine</p>
					</div>
				</div>

				{/* Two-Column Layout: Sessions Table & ACP Rule Spec */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left: Sessions List (Span 2) */}
					<div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
							<div>
								<h2 className="text-base font-bold text-[#0b192c]">Checkout Sessions</h2>
								<p className="text-xs text-slate-500 font-medium">Live agentic checkout sessions across lifecycle</p>
							</div>

							{/* Search & Filter */}
							<div className="flex items-center gap-2">
								<div className="relative">
									<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
									<input
										type="text"
										placeholder="Search sessions..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0c66e4] w-48 font-medium"
									/>
								</div>
							</div>
						</div>

						{/* Status Filters */}
						<div className="flex flex-wrap gap-1.5 text-xs">
							{['all', 'completed', 'refunded', 'rejected', 'updated', 'created', 'cancelled'].map((status) => (
								<button
									key={status}
									onClick={() => setFilterStatus(status)}
									className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all ${
										filterStatus === status
											? 'bg-[#0c66e4] text-white shadow-sm'
											: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
									}`}
								>
									{status}
								</button>
							))}
						</div>

						{/* Sessions Table */}
						{filteredSessions.length === 0 ? (
							<div className="py-14 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
								<Terminal className="w-8 h-8 text-slate-400 animate-pulse" />
								<p className="text-sm font-semibold text-slate-700">No checkout sessions found.</p>
								<p className="text-xs text-slate-500 max-w-sm">
									Run <code className="text-[#0c66e4] bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">python buyer_agent_sim.py</code> to execute the buyer agent simulation.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-slate-200 text-slate-500 font-mono font-bold uppercase bg-slate-50/50">
											<th className="py-3 px-3">Session ID</th>
											<th className="py-3 px-3">Status</th>
											<th className="py-3 px-3">Buyer</th>
											<th className="py-3 px-3">Total</th>
											<th className="py-3 px-3">Razorpay Order / Refund</th>
											<th className="py-3 px-3 text-right">Audit Trail</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 font-medium">
										{filteredSessions.map((s) => {
											const isRecent = recentSessionIds.has(s.id);
											return (
												<tr
													key={s.id}
													className={`transition-all duration-300 group ${
														isRecent
															? 'bg-blue-50/80 border-l-4 border-[#0c66e4]'
															: 'hover:bg-slate-50'
													}`}
												>
													<td className="py-3.5 px-3 font-mono font-bold text-[#0c66e4]">
														<Link href={`/dashboard/${s.id}`} className="hover:underline flex items-center gap-1.5">
															{s.id}
															{isRecent && (
																<span className="w-2 h-2 rounded-full bg-[#0c66e4] animate-ping"></span>
															)}
														</Link>
													</td>
													<td className="py-3.5 px-3">{getStatusBadge(s.status)}</td>
													<td className="py-3.5 px-3 text-slate-700">
														{s.buyer?.email || <span className="text-slate-400 italic">—</span>}
													</td>
													<td className="py-3.5 px-3 font-mono font-bold text-slate-900">
														₹{s.totals?.total?.toFixed(2) || '0.00'}
													</td>
													<td className="py-3.5 px-3 font-mono text-slate-500 space-y-1">
														{s.payment_provider?.razorpay_order_id && (
															<div className="text-[#0c66e4] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold inline-block">
																{s.payment_provider.razorpay_order_id}
															</div>
														)}
														{s.payment_provider?.refund_id && (
															<div className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold inline-block ml-1">
																{s.payment_provider.refund_id}
															</div>
														)}
														{!s.payment_provider?.razorpay_order_id && !s.payment_provider?.refund_id && (
															<span className="text-slate-400 italic">unassigned</span>
														)}
													</td>
													<td className="py-3.5 px-3 text-right">
														<Link
															href={`/dashboard/${s.id}`}
															className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-black transition-colors text-xs font-semibold"
														>
															Inspect
															<ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
														</Link>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Right Column: ACP Guardrails & Live Global Stream */}
					<div className="space-y-6">
						{/* Guardrail Policy Overview */}
						<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
							<h2 className="text-base font-bold text-[#0b192c] flex items-center gap-2">
								<Lock className="w-4 h-4 text-[#0c66e4]" />
								ACP Guardrail Rules
							</h2>
							<p className="text-xs text-slate-500 font-medium">Deterministic bounds checked before state transition</p>

							<div className="space-y-2.5 text-xs font-medium">
								<div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
									<span className="text-slate-700">Max Discount Allowed</span>
									<span className="font-mono text-emerald-700 font-bold">50%</span>
								</div>
								<div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
									<span className="text-slate-700">Max Single Order Value</span>
									<span className="font-mono text-[#0c66e4] font-bold">₹50,000</span>
								</div>
								<div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
									<span className="text-slate-700">Max Quantity / Line Item</span>
									<span className="font-mono text-purple-700 font-bold">10 units</span>
								</div>
								<div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
									<span className="text-slate-700">Idempotency-Key Header</span>
									<span className="font-mono text-amber-700 font-bold">Enforced & Cached</span>
								</div>
							</div>

							<div className="pt-3 border-t border-slate-100">
								<a
									href={`${API_BASE_URL}/.well-known/agent.json`}
									target="_blank"
									rel="noreferrer"
									className="text-xs text-[#0c66e4] hover:text-[#0052cc] font-bold flex items-center justify-between group"
								>
									<span>Capability Feed (/.well-known/agent.json)</span>
									<ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
								</a>
							</div>
						</div>

						{/* Live Audit Stream Card */}
						<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
							<div className="flex items-center justify-between pb-3 border-b border-slate-100">
								<div>
									<h3 className="text-sm font-bold text-[#0b192c] flex items-center gap-2">
										<ShieldCheck className="w-4 h-4 text-[#7c3aed]" />
										Live Audit Feed
									</h3>
									<p className="text-[11px] text-slate-500 font-medium">Recent Firestore state transitions</p>
								</div>
								<span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-100 font-bold">
									/audit_entries
								</span>
							</div>

							{auditStream.length === 0 ? (
								<p className="text-xs text-slate-500 italic py-4 text-center">No audit entries logged yet.</p>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-100 text-xs">
									{auditStream.slice(-6).reverse().map((entry) => {
										const isReject = entry.action === 'reject';
										return (
											<div key={entry.id} className="pt-2.5 first:pt-0 space-y-1">
												<div className="flex items-center justify-between">
													<Link
														href={`/dashboard/${entry.session_id}`}
														className="font-mono text-[#0c66e4] font-bold hover:underline text-[11px] truncate max-w-[140px]"
													>
														{entry.session_id}
													</Link>
													<span
														className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
															isReject
																? 'bg-rose-100 text-rose-800'
																: entry.action === 'complete'
																? 'bg-emerald-100 text-emerald-800'
																: 'bg-blue-100 text-blue-800'
														}`}
													>
														{entry.action}
													</span>
												</div>

												{isReject && entry.reason && (
													<p className="text-[11px] text-rose-800 font-mono bg-rose-50 border border-rose-200 p-2 rounded-lg font-medium">
														{entry.reason}
													</p>
												)}

												<div className="flex justify-between text-[10px] text-slate-400 font-mono font-medium">
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
