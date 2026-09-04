import React from 'react';
import Link from 'next/link';
import { Layers, ShieldCheck, ExternalLink, Terminal, Github, Heart } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function Footer() {
	return (
		<footer className="border-t border-slate-200 bg-[#f8fafc] text-slate-600 font-sans text-xs">
			<div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 space-y-10">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					{/* Brand Column */}
					<div className="md:col-span-2 space-y-4">
						<div className="flex items-center space-x-3">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0c66e4] to-[#00baf2] p-0.5 shadow-sm">
								<div className="w-full h-full bg-white rounded-[6px] flex items-center justify-center">
									<Layers className="w-4 h-4 text-[#0c66e4]" />
								</div>
							</div>
							<span className="font-extrabold text-sm tracking-tight text-[#0b192c]">
								Razorpay ACP Checkout Adapter
							</span>
						</div>
						<p className="text-slate-500 text-xs leading-relaxed max-w-sm">
							Spec-compliant Agentic Commerce Protocol (ACP <code className="text-slate-700 font-mono font-semibold">v2026-04-17</code>)
							financial safety rail backed by Razorpay. Bridging autonomous AI buyer agents to bounded, gated, and
							auditable financial transactions.
						</p>
						<div className="flex items-center gap-2 pt-1">
							<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
								<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
								91 / 91 Automated Tests Passing (100%)
							</span>
						</div>
					</div>

					{/* Protocol Endpoints Column */}
					<div className="space-y-3">
						<div className="font-mono text-xs uppercase tracking-wider text-[#0b192c] font-bold">
							Protocol Rails
						</div>
						<ul className="space-y-2 text-slate-600 font-medium">
							<li>
								<a
									href={`${API_BASE_URL}/.well-known/agent.json`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0c66e4] transition-colors flex items-center gap-1.5"
								>
									<span>Capability Manifest</span>
									<ExternalLink className="w-3 h-3 text-slate-400" />
								</a>
							</li>
							<li>
								<a
									href={`${API_BASE_URL}/products`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0c66e4] transition-colors flex items-center gap-1.5"
								>
									<span>Authoritative Catalog</span>
									<ExternalLink className="w-3 h-3 text-slate-400" />
								</a>
							</li>
							<li>
								<Link href="/dashboard" className="hover:text-[#0c66e4] transition-colors">
									Live Operator Dashboard
								</Link>
							</li>
							<li>
								<a
									href={`${API_BASE_URL}/health`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0c66e4] transition-colors flex items-center gap-1.5"
								>
									<span>Health Check Probe</span>
									<ExternalLink className="w-3 h-3 text-slate-400" />
								</a>
							</li>
						</ul>
					</div>

					{/* Track & Repo Column */}
					<div className="space-y-3">
						<div className="font-mono text-xs uppercase tracking-wider text-[#0b192c] font-bold">
							Hackathon Track 01
						</div>
						<ul className="space-y-2 text-slate-500">
							<li>AI Growth & Agentic Commerce</li>
							<li>Razorpay Payment Rail Bridge</li>
							<li>Firestore Immutable Audit Stream</li>
							<li>Deterministic Guardrail Rule Engine</li>
							<li>Sliding-Window Anomaly Scoring</li>
						</ul>
					</div>
				</div>

				<div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
					<div>
						Built by <span className="text-slate-800 font-bold">Mohan Prasath</span> @{' '}
						<span className="text-[#0c66e4] font-bold">TaskDrift</span>
					</div>
					<div className="font-mono text-[11px] text-slate-400">
						Agentic Commerce Protocol (ACP) Spec Version: 2026-04-17
					</div>
				</div>
			</div>
		</footer>
	);
}
