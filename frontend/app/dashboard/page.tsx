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
	Clock,
	AlertTriangle,
	ExternalLink,
	Home,
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

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4]">
						<CheckCircle2 className="w-3 h-3 text-[#0F5E56]" />
						completed
					</span>
				);
			case 'refunded':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4F1EC] text-[#5C5852] border border-[#E8E5DF]">
						<RefreshCw className="w-3 h-3 text-[#5C5852]" />
						refunded
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F9ECE5] text-[#C4602A] border border-[#E8C2AF]">
						<XCircle className="w-3 h-3 text-[#C4602A]" />
						rejected
					</span>
				);
			case 'cancelled':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4F1EC] text-[#5C5852] border border-[#E8E5DF]">
						<AlertTriangle className="w-3 h-3 text-[#5C5852]" />
						cancelled
					</span>
				);
			case 'updated':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-[#141210] border border-[#E8E5DF]">
						<RefreshCw className="w-3 h-3 text-[#141210]" />
						updated
					</span>
				);
			case 'ready_for_payment':
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4]">
						<CreditCard className="w-3 h-3 text-[#0F5E56]" />
						ready
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4F1EC] text-[#5C5852] border border-[#E8E5DF]">
						<Clock className="w-3 h-3" />
						{status}
					</span>
				);
		}
	};

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-[#141210] p-6 md:p-10 font-sans selection:bg-[#0F5E56]/15 selection:text-[#0F5E56]">
			{/* Top Navigation Header */}
			<header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-[#E8E5DF] gap-4">
				<div className="flex items-center space-x-4">
					<div className="w-10 h-10 rounded-xl bg-[#0F5E56] flex items-center justify-center text-white shadow-sm">
						<Layers className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-serif font-bold tracking-tight text-[#141210] flex items-center gap-2.5">
							AgentPay Bridge
							<span className="text-xs font-mono px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-semibold">
								v2026-04-17
							</span>
						</h1>
						<p className="text-xs text-[#5C5852] font-medium">
							Track 01 - AI Growth and Agentic Commerce | Payment rail: Razorpay Orders API
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Link
						href="/"
						className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E5DF] bg-white hover:bg-[#F4F1EC] text-[#141210] text-xs font-semibold shadow-sm transition-all"
					>
						<Home className="w-3.5 h-3.5 text-[#0F5E56]" />
						<span>Landing Page</span>
					</Link>

					<button
						onClick={() => setAutoRefresh(!autoRefresh)}
						className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-sm transition-all ${
							autoRefresh
								? 'bg-[#E6F0EE] border-[#C5D8D4] text-[#0F5E56]'
								: 'bg-white border-[#E8E5DF] text-[#5C5852] hover:bg-[#F4F1EC]'
						}`}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
						{autoRefresh ? 'Live Polling (2s)' : 'Polling Paused'}
					</button>

					<div
						className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-sm ${
							isBackendOnline
								? 'bg-[#E6F0EE] border-[#C5D8D4] text-[#0F5E56]'
								: 'bg-[#F9ECE5] border-[#E8C2AF] text-[#C4602A]'
						}`}
					>
						<span
							className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-[#0F5E56]' : 'bg-[#C4602A]'}`}
						></span>
						{isBackendOnline ? 'Backend Rail Live' : 'Backend Offline'}
					</div>

					<div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E8E5DF] text-[#5C5852] text-xs font-semibold shadow-sm">
						<CreditCard className="w-3.5 h-3.5 text-[#0F5E56]" />
						<span>Payment Rail: Razorpay</span>
					</div>
				</div>
			</header>

			{/* Main Grid */}
			<main className="max-w-7xl mx-auto pt-8 space-y-8">
				{/* Metrics Row */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
						<div className="flex items-center justify-between text-[#5C5852] text-xs font-mono font-medium uppercase tracking-wider mb-2">
							<span>Total Sessions</span>
							<Activity className="w-4 h-4 text-[#0F5E56]" />
						</div>
						<div className="text-2xl font-bold text-[#141210] font-mono">{totalSessions}</div>
						<p className="text-xs text-[#5C5852] mt-1 font-normal">Lifecycle executions recorded</p>
					</div>

					<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
						<div className="flex items-center justify-between text-[#5C5852] text-xs font-mono font-medium uppercase tracking-wider mb-2">
							<span>Completed</span>
							<CheckCircle2 className="w-4 h-4 text-[#0F5E56]" />
						</div>
						<div className="text-2xl font-bold text-[#0F5E56] font-mono">{completedCount}</div>
						<p className="text-xs text-[#5C5852] mt-1 font-normal">Razorpay orders created</p>
					</div>

					<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
						<div className="flex items-center justify-between text-[#5C5852] text-xs font-mono font-medium uppercase tracking-wider mb-2">
							<span>Bounded Rejections</span>
							<XCircle className="w-4 h-4 text-[#C4602A]" />
						</div>
						<div className="text-2xl font-bold text-[#C4602A] font-mono">{rejectedCount}</div>
						<p className="text-xs text-[#5C5852] mt-1 font-normal">Gated violations stopped</p>
					</div>

					<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
						<div className="flex items-center justify-between text-[#5C5852] text-xs font-mono font-medium uppercase tracking-wider mb-2">
							<span>Guardrail Bounds</span>
							<ShieldCheck className="w-4 h-4 text-[#5C5852]" />
						</div>
						<div className="text-sm font-bold text-[#141210]">Active and Enforced</div>
						<p className="text-xs text-[#5C5852] mt-1 font-normal">Deterministic rule engine</p>
					</div>
				</div>

				{/* Two-Column Layout: Sessions Table & ACP Rule Spec */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left: Sessions List (Span 2) */}
					<div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8E5DF]">
							<div>
								<h2 className="text-base font-bold text-[#141210]">Checkout Sessions</h2>
								<p className="text-xs text-[#5C5852] font-normal">Live agentic checkout sessions across lifecycle</p>
							</div>

							{/* Search & Filter */}
							<div className="flex items-center gap-2">
								<div className="relative">
									<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
									<input
										type="text"
										placeholder="Search sessions..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="bg-[#FAF9F6] border border-[#E8E5DF] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#141210] placeholder-[#8C8880] focus:outline-none focus:border-[#0F5E56] w-48 font-medium"
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
											? 'bg-[#0F5E56] text-white shadow-sm'
											: 'bg-[#F4F1EC] text-[#5C5852] hover:bg-[#E8E5DF]'
									}`}
								>
									{status}
								</button>
							))}
						</div>

						{/* Sessions Table */}
						{filteredSessions.length === 0 ? (
							<div className="py-14 text-center text-[#5C5852] flex flex-col items-center justify-center space-y-3">
								<Terminal className="w-7 h-7 text-[#8C8880]" />
								<p className="text-sm font-semibold text-[#141210]">No checkout sessions found.</p>
								<p className="text-xs text-[#5C5852] max-w-sm">
									Run <code className="text-[#0F5E56] bg-[#E6F0EE] px-1.5 py-0.5 rounded font-mono font-bold">python buyer_agent_sim.py</code> to execute the buyer agent simulation.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-[#E8E5DF] text-[#5C5852] font-mono uppercase tracking-wider bg-[#FAF9F6]">
											<th className="py-3 px-3">Session ID</th>
											<th className="py-3 px-3">Status</th>
											<th className="py-3 px-3">Buyer</th>
											<th className="py-3 px-3">Total</th>
											<th className="py-3 px-3">Razorpay Order / Refund</th>
											<th className="py-3 px-3 text-right">Audit Trail</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[#E8E5DF] font-normal">
										{filteredSessions.map((s) => {
											const isRecent = recentSessionIds.has(s.id);
											return (
												<tr
													key={s.id}
													className={`transition-all duration-300 group ${
														isRecent
															? 'bg-[#E6F0EE]/60 border-l-4 border-[#0F5E56]'
															: 'hover:bg-[#FAF9F6]'
													}`}
												>
													<td className="py-3.5 px-3 font-mono font-bold text-[#0F5E56]">
														<Link href={`/dashboard/${s.id}`} className="hover:underline flex items-center gap-1.5">
															{s.id}
															{isRecent && (
																<span className="w-1.5 h-1.5 rounded-full bg-[#0F5E56]"></span>
															)}
														</Link>
													</td>
													<td className="py-3.5 px-3">{getStatusBadge(s.status)}</td>
													<td className="py-3.5 px-3 text-[#5C5852]">
														{s.buyer?.email || <span className="text-[#8C8880] italic">-</span>}
													</td>
													<td className="py-3.5 px-3 font-mono font-bold text-[#141210]">
														Rs {s.totals?.total?.toFixed(2) || '0.00'}
													</td>
													<td className="py-3.5 px-3 font-mono text-[#5C5852] space-y-1">
														{s.payment_provider?.razorpay_order_id && (
															<div className="text-[#0F5E56] bg-[#E6F0EE] px-2 py-0.5 rounded border border-[#C5D8D4] font-semibold inline-block">
																{s.payment_provider.razorpay_order_id}
															</div>
														)}
														{s.payment_provider?.refund_id && (
															<div className="text-[#5C5852] bg-[#F4F1EC] px-2 py-0.5 rounded border border-[#E8E5DF] font-semibold inline-block ml-1">
																{s.payment_provider.refund_id}
															</div>
														)}
														{!s.payment_provider?.razorpay_order_id && !s.payment_provider?.refund_id && (
															<span className="text-[#8C8880] italic">unassigned</span>
														)}
													</td>
													<td className="py-3.5 px-3 text-right">
														<Link
															href={`/dashboard/${s.id}`}
															className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F4F1EC] hover:bg-[#E8E5DF] text-[#141210] transition-colors text-xs font-semibold"
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
						<div className="p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge space-y-4">
							<h2 className="text-base font-bold text-[#141210] flex items-center gap-2">
								<Lock className="w-4 h-4 text-[#0F5E56]" />
								ACP Guardrail Rules
							</h2>
							<p className="text-xs text-[#5C5852] font-normal">Deterministic bounds checked before state transition</p>

							<div className="space-y-2.5 text-xs font-medium">
								<div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] flex justify-between items-center">
									<span className="text-[#5C5852]">Max Discount Allowed</span>
									<span className="font-mono text-[#0F5E56] font-bold">50%</span>
								</div>
								<div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] flex justify-between items-center">
									<span className="text-[#5C5852]">Max Single Order Value</span>
									<span className="font-mono text-[#0F5E56] font-bold">Rs 50,000</span>
								</div>
								<div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] flex justify-between items-center">
									<span className="text-[#5C5852]">Max Quantity / Line Item</span>
									<span className="font-mono text-[#141210] font-bold">10 units</span>
								</div>
								<div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5DF] flex justify-between items-center">
									<span className="text-[#5C5852]">Idempotency-Key Header</span>
									<span className="font-mono text-[#5C5852] font-bold">Enforced and Cached</span>
								</div>
							</div>

							<div className="pt-3 border-t border-[#E8E5DF]">
								<a
									href={`${API_BASE_URL}/.well-known/agent.json`}
									target="_blank"
									rel="noreferrer"
									className="text-xs text-[#0F5E56] hover:underline font-semibold flex items-center justify-between group"
								>
									<span>Capability Feed (/.well-known/agent.json)</span>
									<ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
								</a>
							</div>
						</div>

						{/* Live Audit Stream Card */}
						<div className="p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge space-y-4">
							<div className="flex items-center justify-between pb-3 border-b border-[#E8E5DF]">
								<div>
									<h3 className="text-sm font-bold text-[#141210] flex items-center gap-2">
										<ShieldCheck className="w-4 h-4 text-[#0F5E56]" />
										Live Audit Feed
									</h3>
									<p className="text-[11px] text-[#5C5852] font-normal">Recent Firestore state transitions</p>
								</div>
								<span className="text-[10px] font-mono text-[#5C5852] px-2 py-0.5 rounded bg-[#F4F1EC] font-semibold">
									/audit_entries
								</span>
							</div>

							{auditStream.length === 0 ? (
								<p className="text-xs text-[#8C8880] italic py-4 text-center">No audit entries logged yet.</p>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto pr-1 divide-y divide-[#E8E5DF] text-xs">
									{auditStream.slice(-6).reverse().map((entry) => {
										const isReject = entry.action === 'reject';
										return (
											<div key={entry.id} className="pt-2.5 first:pt-0 space-y-1">
												<div className="flex items-center justify-between">
													<Link
														href={`/dashboard/${entry.session_id}`}
														className="font-mono text-[#0F5E56] font-bold hover:underline text-[11px] truncate max-w-[140px]"
													>
														{entry.session_id}
													</Link>
													<span
														className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
															isReject
																? 'bg-[#F9ECE5] text-[#C4602A]'
																: entry.action === 'complete'
																? 'bg-[#E6F0EE] text-[#0F5E56]'
																: 'bg-[#F4F1EC] text-[#141210]'
														}`}
													>
														{entry.action}
													</span>
												</div>

												{isReject && entry.reason && (
													<p className="text-[11px] text-[#C4602A] font-mono bg-[#F9ECE5] border border-[#E8C2AF] p-2 rounded-lg font-normal">
														{entry.reason}
													</p>
												)}

												<div className="flex justify-between text-[10px] text-[#8C8880] font-mono">
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

