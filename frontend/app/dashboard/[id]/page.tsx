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
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
						<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
						Completed
					</span>
				);
			case 'refunded':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
						<RefreshCw className="w-3.5 h-3.5 text-purple-600" />
						Refunded (Post-Completion)
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
						<XCircle className="w-3.5 h-3.5 text-rose-600" />
						Rejected (Guardrail Breach)
					</span>
				);
			case 'cancelled':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
						<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
						Cancelled
					</span>
				);
			case 'updated':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
						<RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
						Updated
					</span>
				);
			case 'ready_for_payment':
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F0EE] text-[#0F5E56] border border-[#0F5E56]/30">
						<CreditCard className="w-3.5 h-3.5 text-[#0F5E56]" />
						Ready for Payment
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-[#E8E5DF]">
						<Clock className="w-3.5 h-3.5" />
						{status || 'Created'}
					</span>
				);
		}
	};

	return (
		<div className="min-h-screen bg-[#FAF9F6] text-[#141210] p-6 md:p-10 font-sans selection:bg-[#0F5E56]/15 selection:text-[#0F5E56]">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Back button & top bar */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E5DF]">
					<div className="flex items-center space-x-3">
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-sm font-semibold border border-[#E8E5DF] shadow-sm"
						>
							<ArrowLeft className="w-4 h-4 text-[#0F5E56]" />
							Back to Sessions
						</Link>
						<span className="text-neutral-300">/</span>
						<span className="font-mono text-sm font-bold text-neutral-800 truncate max-w-xs">{sessionId}</span>
					</div>

					<button
						onClick={loadData}
						disabled={loading}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 text-[#0F5E56] border border-[#E8E5DF] text-xs font-bold transition-all shadow-sm"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>

				{error && (
					<div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
						<XCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
						<p className="text-sm font-medium">{error}</p>
					</div>
				)}

				{/* Header Section */}
				<div className="p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold text-[#141210] font-mono">{sessionId}</h1>
							{getStatusBadge(session?.status)}
						</div>
						<p className="text-xs text-neutral-500 font-mono font-medium">
							Spec: ACP v2026-04-17 | Rail: Razorpay Orders API
						</p>
					</div>

					{session?.totals && (
						<div className="flex items-baseline gap-2 bg-[#FAF9F6] px-5 py-3 rounded-2xl border border-[#E8E5DF]">
							<span className="text-xs text-neutral-500 uppercase font-mono font-bold">Total</span>
							<span className="text-2xl font-bold text-[#141210] font-mono">
								Rs {session.totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</span>
							<span className="text-xs text-neutral-500 font-bold">{session.totals.currency}</span>
						</div>
					)}
				</div>

				{/* Rejection Alert Banner if any rejected entry exists */}
				{auditEntries.some((e) => e.action === 'reject') && (
					<div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm space-y-2">
						<div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
							<AlertTriangle className="w-5 h-5 text-rose-600" />
							<span>Bounded Guardrail Policy Violation Detected</span>
						</div>
						<p className="text-xs text-slate-700 font-medium">
							The buyer agent's request was bounded and safely rejected by the deterministic ACP rule engine without state corruption:
						</p>
						<div className="mt-2 p-3.5 rounded-xl bg-rose-100/70 border border-rose-200 font-mono text-xs text-rose-900 font-semibold">
							{auditEntries.find((e) => e.action === 'reject')?.reason || 'Guardrail violation constraint breached.'}
						</div>
					</div>
				)}

				{/* Two column layout: Details & Full Audit Trail */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left: Metadata & Cart Breakdown */}
					<div className="space-y-6">
						{/* Buyer & Address Card */}
						<div className="p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-[#141210] flex items-center gap-2">
								<User className="w-4 h-4 text-[#0F5E56]" />
								Buyer & Destination
							</h3>

							{session?.buyer ? (
								<div className="space-y-1.5 text-xs">
									<div className="text-neutral-900 font-bold">{session.buyer.name}</div>
									<div className="text-neutral-500 font-mono">{session.buyer.email}</div>
									{session.buyer.phone && <div className="text-neutral-500 font-mono">{session.buyer.phone}</div>}
								</div>
							) : (
								<p className="text-xs text-neutral-400 italic">No buyer info provided</p>
							)}

							<div className="pt-3 border-t border-[#E8E5DF]">
								<h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 mb-2">
									<MapPin className="w-3.5 h-3.5 text-[#0F5E56]" />
									Fulfillment Address
								</h4>
								{session?.fulfillment_address ? (
									<div className="text-xs text-neutral-600 space-y-0.5 font-medium">
										<div>{session.fulfillment_address.line1}</div>
										{session.fulfillment_address.line2 && <div>{session.fulfillment_address.line2}</div>}
										<div>
											{session.fulfillment_address.city}, {session.fulfillment_address.state}{' '}
											{session.fulfillment_address.postal_code}
										</div>
										<div className="text-neutral-500 font-mono uppercase font-bold">{session.fulfillment_address.country}</div>
									</div>
								) : (
									<p className="text-xs text-neutral-400 italic">No fulfillment address provided</p>
								)}
							</div>
						</div>

						{/* Line Items Card */}
						<div className="p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-sm space-y-4">
							<h3 className="text-sm font-bold text-[#141210] flex items-center gap-2">
								<Package className="w-4 h-4 text-[#0F5E56]" />
								Authoritative Line Items
							</h3>

							{session?.line_items && session.line_items.length > 0 ? (
								<div className="divide-y divide-[#E8E5DF] text-xs">
									{session.line_items.map((item, idx) => (
										<div key={idx} className="py-2.5 flex justify-between items-center">
											<div>
												<div className="font-mono font-bold text-neutral-800">{item.product_id}</div>
												<div className="text-neutral-500 text-[11px] font-medium">Qty: {item.quantity} x Rs {item.unit_price}</div>
											</div>
											<div className="font-mono font-bold text-neutral-900">
												Rs {(item.quantity * item.unit_price).toFixed(2)}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-neutral-400 italic">No line items in session</p>
							)}

							{/* Financial Totals */}
							{session?.totals && (
								<div className="pt-4 border-t border-[#E8E5DF] space-y-2 text-xs font-mono">
									<div className="flex justify-between text-neutral-600 font-medium">
										<span>Subtotal</span>
										<span>Rs {session.totals.subtotal.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-emerald-700 font-bold">
										<span>Discount</span>
										<span>-Rs {session.totals.discount.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-neutral-600 font-medium">
										<span>Tax (18% GST)</span>
										<span>Rs {session.totals.tax.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-[#141210] font-bold pt-2 border-t border-[#E8E5DF] text-sm">
										<span>Total</span>
										<span>Rs {session.totals.total.toFixed(2)}</span>
									</div>
								</div>
							)}
						</div>

						{/* Razorpay Rail Info */}
						{(session?.payment_provider?.razorpay_order_id || session?.payment_provider?.refund_id) && (
							<div className="p-5 rounded-2xl bg-[#E6F0EE]/60 border border-[#0F5E56]/30 space-y-2 text-xs shadow-sm">
								<div className="flex items-center gap-2 text-[#0F5E56] font-bold">
									<CreditCard className="w-4 h-4" />
									<span>Payment Rail: Razorpay Orders API</span>
								</div>
								{session?.payment_provider?.razorpay_order_id && (
									<div className="font-mono text-neutral-700 break-all font-medium">
										Order ID: <span className="text-[#0F5E56] font-bold">{session.payment_provider.razorpay_order_id}</span>
									</div>
								)}
								{session?.payment_provider?.refund_id && (
									<div className="font-mono text-neutral-700 break-all font-medium">
										Refund ID: <span className="text-[#0F5E56] font-bold">{session.payment_provider.refund_id}</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Right: Full Chronological Audit Trail (Span 2) */}
					<div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E8E5DF] shadow-sm space-y-6">
						<div className="flex items-center justify-between pb-4 border-b border-[#E8E5DF]">
							<div>
								<h2 className="text-base font-bold text-[#141210] flex items-center gap-2">
									<ShieldCheck className="w-5 h-5 text-[#0F5E56]" />
									Chronological Audit Trail
								</h2>
								<p className="text-xs text-neutral-500 font-medium">Immutable Firestore event log for this session</p>
							</div>
							<span className="text-xs font-mono text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full font-bold">
								{auditEntries.length} {auditEntries.length === 1 ? 'Event' : 'Events'}
							</span>
						</div>

						{auditEntries.length === 0 ? (
							<div className="py-12 text-center text-neutral-400 text-xs italic">
								No audit records found for this checkout session.
							</div>
						) : (
							<div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E5DF]">
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
												className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
													isReject
														? 'border-rose-500'
														: isRefund
														? 'border-neutral-500'
														: isComplete
														? 'border-emerald-600'
														: isCancel
														? 'border-amber-500'
														: isUpdate
														? 'border-[#0F5E56]'
														: 'border-[#0F5E56]'
												}`}
											>
												<div
													className={`w-2 h-2 rounded-full ${
														isReject
															? 'bg-rose-500'
															: isRefund
															? 'bg-neutral-500'
															: isComplete
															? 'bg-emerald-600'
															: isCancel
															? 'bg-amber-500'
															: isUpdate
															? 'bg-[#0F5E56]'
															: 'bg-[#0F5E56]'
													}`}
												/>
											</div>

											{/* Event Header */}
											<div className="flex flex-wrap items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<span
														className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
															isReject
																? 'bg-rose-50 text-rose-700 border-rose-200'
																: isRefund
																? 'bg-neutral-100 text-neutral-700 border-neutral-200'
																: isComplete
																? 'bg-emerald-50 text-emerald-700 border-emerald-200'
																: isCancel
																? 'bg-amber-50 text-amber-700 border-amber-200'
																: isUpdate
																? 'bg-[#E6F0EE] text-[#0F5E56] border-[#0F5E56]/30'
																: 'bg-[#E6F0EE] text-[#0F5E56] border-[#0F5E56]/30'
														}`}
													>
														{entry.action}
													</span>
													<span className="text-xs text-neutral-500 font-mono font-medium">Actor: {entry.actor}</span>
												</div>
												<span className="text-xs text-neutral-400 font-mono">
													{new Date(entry.timestamp).toLocaleString()}
												</span>
											</div>

											{/* Financial Delta */}
											{(typeof entry.before_total === 'number' || typeof entry.after_total === 'number') && (
												<div className="text-xs font-mono text-neutral-600 flex items-center gap-3 font-medium">
													{typeof entry.before_total === 'number' && (
														<span>Before: Rs {entry.before_total.toFixed(2)}</span>
													)}
													{typeof entry.before_total === 'number' && typeof entry.after_total === 'number' && <span>-&gt;</span>}
													{typeof entry.after_total === 'number' && (
														<span className="text-[#141210] font-bold">
															After: Rs {entry.after_total.toFixed(2)}
														</span>
													)}
												</div>
											)}

											{/* Rejection Reason Display */}
											{isReject && entry.reason && (
												<div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-mono space-y-1">
													<div className="text-rose-700 font-bold flex items-center gap-1.5">
														<XCircle className="w-3.5 h-3.5" />
														Gated Guardrail Violation:
													</div>
													<div className="whitespace-pre-wrap font-medium">{entry.reason}</div>
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
