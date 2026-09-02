'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
	ArrowLeft,
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Clock,
	User,
	MapPin,
	Package,
	CreditCard,
	FileText,
	Layers,
	RefreshCw,
	TrendingUp,
	TrendingDown,
} from 'lucide-react';
import { CheckoutSession, AuditEntry } from '@/lib/types';
import { fetchSessionById, fetchSessionAudit } from '@/lib/api';

export default function SessionDetailPage() {
	const params = useParams();
	const sessionId = params?.id as string;

	const [session, setSession] = useState<CheckoutSession | null>(null);
	const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadData = async () => {
		if (!sessionId) return;
		setLoading(true);
		setError(null);
		try {
			const [sessionData, auditData] = await Promise.all([
				fetchSessionById(sessionId),
				fetchSessionAudit(sessionId),
			]);

			if (!sessionData && auditData.length === 0) {
				setError(`Checkout session "${sessionId}" was not found.`);
			} else {
				setSession(sessionData);
				setAuditEntries(auditData);
			}
		} catch (err) {
			setError('Failed to load session details.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, [sessionId]);

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
						<CheckCircle2 className="w-3.5 h-3.5" />
						Completed
					</span>
				);
			case 'refunded':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
						<RefreshCw className="w-3.5 h-3.5" />
						Refunded (Post-Completion)
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
						<XCircle className="w-3.5 h-3.5" />
						Rejected (Guardrail Violation)
					</span>
				);
			case 'cancelled':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
						<AlertTriangle className="w-3.5 h-3.5" />
						Cancelled
					</span>
				);
			case 'updated':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						<RefreshCw className="w-3.5 h-3.5" />
						Updated
					</span>
				);
			case 'ready_for_payment':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
						<CreditCard className="w-3.5 h-3.5" />
						Ready For Payment
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
						<Clock className="w-3.5 h-3.5" />
						{status || 'Created'}
					</span>
				);
		}
	};

	return (
		<div className="min-h-screen bg-[#090a0f] text-slate-100 p-6 md:p-10 font-sans">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Back button & top bar */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
					<div className="flex items-center space-x-3">
						<Link
							href="/"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm border border-slate-700/50"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Sessions
						</Link>
						<span className="text-slate-600">/</span>
						<span className="font-mono text-sm text-slate-300 truncate max-w-xs">{sessionId}</span>
					</div>

					<button
						onClick={loadData}
						disabled={loading}
						className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>

				{error && (
					<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
						<XCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
						<p className="text-sm">{error}</p>
					</div>
				)}

				{/* Header Section */}
				<div className="p-6 rounded-2xl bg-[#11131f] border border-[#1e2238] flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold text-white font-mono">{sessionId}</h1>
							{getStatusBadge(session?.status)}
						</div>
						<p className="text-xs text-slate-400 font-mono">
							Spec: ACP v2026-04-17 • Provider: Razorpay Test Rail
						</p>
					</div>

					{session?.totals && (
						<div className="flex items-baseline gap-2 bg-slate-900/60 px-5 py-3 rounded-xl border border-slate-800">
							<span className="text-xs text-slate-400 uppercase font-mono">Total</span>
							<span className="text-2xl font-bold text-white font-mono">
								₹{session.totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</span>
							<span className="text-xs text-slate-500">{session.totals.currency}</span>
						</div>
					)}
				</div>

				{/* Rejection Alert Banner if any rejected entry exists */}
				{auditEntries.some((e) => e.action === 'reject') && (
					<div className="p-5 rounded-xl bg-rose-950/40 border border-rose-500/40 shadow-lg shadow-rose-950/20 space-y-2">
						<div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
							<AlertTriangle className="w-5 h-5 text-rose-400" />
							<span>Bounded Guardrail Policy Violation Detected</span>
						</div>
						<p className="text-xs text-slate-300">
							The buyer agent's request was bounded and safely rejected by the deterministic ACP rule engine without state corruption:
						</p>
						<div className="mt-2 p-3 rounded-lg bg-rose-900/30 border border-rose-500/30 font-mono text-sm text-rose-200">
							{auditEntries.find((e) => e.action === 'reject')?.reason || 'Guardrail violation constraint breached.'}
						</div>
					</div>
				)}

				{/* Two column layout: Details & Full Audit Trail */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left: Metadata & Cart Breakdown */}
					<div className="space-y-6">
						{/* Buyer & Address Card */}
						<div className="p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-4">
							<h3 className="text-sm font-semibold text-white flex items-center gap-2">
								<User className="w-4 h-4 text-blue-400" />
								Buyer & Destination
							</h3>

							{session?.buyer ? (
								<div className="space-y-1.5 text-xs">
									<div className="text-slate-200 font-medium">{session.buyer.name}</div>
									<div className="text-slate-400 font-mono">{session.buyer.email}</div>
									{session.buyer.phone && <div className="text-slate-400 font-mono">{session.buyer.phone}</div>}
								</div>
							) : (
								<p className="text-xs text-slate-500 italic">No buyer info provided</p>
							)}

							<div className="pt-3 border-t border-slate-800/80">
								<h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
									<MapPin className="w-3.5 h-3.5 text-indigo-400" />
									Fulfillment Address
								</h4>
								{session?.fulfillment_address ? (
									<div className="text-xs text-slate-300 space-y-0.5">
										<div>{session.fulfillment_address.line1}</div>
										{session.fulfillment_address.line2 && <div>{session.fulfillment_address.line2}</div>}
										<div>
											{session.fulfillment_address.city}, {session.fulfillment_address.state}{' '}
											{session.fulfillment_address.postal_code}
										</div>
										<div className="text-slate-500 font-mono uppercase">{session.fulfillment_address.country}</div>
									</div>
								) : (
									<p className="text-xs text-slate-500 italic">No fulfillment address provided</p>
								)}
							</div>
						</div>

						{/* Line Items Card */}
						<div className="p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-4">
							<h3 className="text-sm font-semibold text-white flex items-center gap-2">
								<Package className="w-4 h-4 text-purple-400" />
								Authoritative Line Items
							</h3>

							{session?.line_items && session.line_items.length > 0 ? (
								<div className="divide-y divide-slate-800/60 text-xs">
									{session.line_items.map((item, idx) => (
										<div key={idx} className="py-2.5 flex justify-between items-center">
											<div>
												<div className="font-mono text-slate-200">{item.product_id}</div>
												<div className="text-slate-500 text-[11px]">Qty: {item.quantity} × ₹{item.unit_price}</div>
											</div>
											<div className="font-mono text-slate-300">
												₹{(item.quantity * item.unit_price).toFixed(2)}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-slate-500 italic">No line items in session</p>
							)}

							{/* Financial Totals */}
							{session?.totals && (
								<div className="pt-4 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
									<div className="flex justify-between text-slate-400">
										<span>Subtotal</span>
										<span>₹{session.totals.subtotal.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-emerald-400">
										<span>Discount</span>
										<span>-₹{session.totals.discount.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-slate-400">
										<span>Tax (18% GST)</span>
										<span>₹{session.totals.tax.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-white font-bold pt-2 border-t border-slate-800 text-sm">
										<span>Total</span>
										<span>₹{session.totals.total.toFixed(2)}</span>
									</div>
								</div>
							)}
						</div>

						{/* Razorpay Bridge Info */}
						{(session?.payment_provider?.razorpay_order_id || session?.payment_provider?.refund_id) && (
							<div className="p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 text-xs">
								<div className="flex items-center gap-2 text-indigo-400 font-semibold">
									<CreditCard className="w-4 h-4" />
									<span>Razorpay Payment Rail</span>
								</div>
								{session?.payment_provider?.razorpay_order_id && (
									<div className="font-mono text-slate-300 break-all">
										Order ID: <span className="text-indigo-300">{session.payment_provider.razorpay_order_id}</span>
									</div>
								)}
								{session?.payment_provider?.refund_id && (
									<div className="font-mono text-purple-300 break-all">
										Refund ID: <span className="text-purple-300">{session.payment_provider.refund_id}</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Right: Full Chronological Audit Trail (Span 2) */}
					<div className="lg:col-span-2 p-6 rounded-xl bg-[#11131f] border border-[#1e2238] space-y-6">
						<div className="flex items-center justify-between pb-4 border-b border-slate-800">
							<div>
								<h2 className="text-base font-semibold text-white flex items-center gap-2">
									<ShieldCheck className="w-5 h-5 text-indigo-400" />
									Chronological Audit Trail
								</h2>
								<p className="text-xs text-slate-400">Immutable Firestore event log for this session</p>
							</div>
							<span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded">
								{auditEntries.length} {auditEntries.length === 1 ? 'Event' : 'Events'}
							</span>
						</div>

						{auditEntries.length === 0 ? (
							<div className="py-12 text-center text-slate-500 text-xs">
								No audit records found for this checkout session.
							</div>
						) : (
							<div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
								{auditEntries.map((entry, index) => {
									const isReject = entry.action === 'reject';
									const isComplete = entry.action === 'complete';
									const isRefund = entry.action === 'refund';
									const isCancel = entry.action === 'cancel';
									const isUpdate = entry.action === 'update';

									return (
										<div key={entry.id || index} className="relative space-y-2">
											{/* Timeline Dot */}
											<div
												className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-[#090a0f] flex items-center justify-center ${
													isReject
														? 'border-rose-500 bg-rose-500/20'
														: isRefund
														? 'border-purple-500 bg-purple-500/20'
														: isComplete
														? 'border-emerald-500 bg-emerald-500/20'
														: isCancel
														? 'border-amber-500 bg-amber-500/20'
														: isUpdate
														? 'border-indigo-500 bg-indigo-500/20'
														: 'border-blue-500 bg-blue-500/20'
												}`}
											>
												<div
													className={`w-1.5 h-1.5 rounded-full ${
														isReject
															? 'bg-rose-400'
															: isRefund
															? 'bg-purple-400'
															: isComplete
															? 'bg-emerald-400'
															: isCancel
															? 'bg-amber-400'
															: isUpdate
															? 'bg-indigo-400'
															: 'bg-blue-400'
													}`}
												/>
											</div>

											{/* Event Header */}
											<div className="flex flex-wrap items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<span
														className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold ${
															isReject
																? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
																: isRefund
																? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
																: isComplete
																? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
																: isCancel
																? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
																: isUpdate
																? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
																: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
														}`}
													>
														{entry.action}
													</span>
													<span className="text-xs text-slate-400 font-mono">Actor: {entry.actor}</span>
												</div>
												<span className="text-xs text-slate-500 font-mono">
													{new Date(entry.timestamp).toLocaleString()}
												</span>
											</div>

											{/* Financial Delta */}
											{(typeof entry.before_total === 'number' || typeof entry.after_total === 'number') && (
												<div className="text-xs font-mono text-slate-400 flex items-center gap-3">
													{typeof entry.before_total === 'number' && (
														<span>Before: ₹{entry.before_total.toFixed(2)}</span>
													)}
													{typeof entry.before_total === 'number' && typeof entry.after_total === 'number' && <span>→</span>}
													{typeof entry.after_total === 'number' && (
														<span className="text-slate-200 font-semibold">
															After: ₹{entry.after_total.toFixed(2)}
														</span>
													)}
												</div>
											)}

											{/* Rejection Reason Display */}
											{isReject && entry.reason && (
												<div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 font-mono space-y-1">
													<div className="text-rose-400 font-bold flex items-center gap-1.5">
														<XCircle className="w-3.5 h-3.5" />
														Gated Guardrail Violation:
													</div>
													<div className="whitespace-pre-wrap">{entry.reason}</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
