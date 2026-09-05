import React from 'react';
import Link from 'next/link';
import { Layers, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function Footer() {
	return (
		<footer className="border-t border-[#E8E5DF] bg-[#FAF9F6] text-[#5C5852] font-sans text-xs">
			<div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 space-y-10">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					{/* Brand Column */}
					<div className="md:col-span-2 space-y-4">
						<div className="flex items-center space-x-3">
							<div className="w-8 h-8 rounded-lg bg-[#0F5E56] flex items-center justify-center text-white shadow-sm">
								<Layers className="w-4 h-4 text-white" />
							</div>
							<span className="font-serif font-bold text-base tracking-tight text-[#141210]">
								AgentPay Bridge
							</span>
						</div>
						<p className="text-[#5C5852] text-xs leading-relaxed max-w-sm">
							ACP-compliant checkout adapter for autonomous AI buyer agents. Enforcing
							server-authoritative pricing, deterministic guardrails, and immutable audit
							trails. Payment rail: Razorpay Orders API.
						</p>
						<div className="flex items-center gap-2 pt-1">
							<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-semibold">
								<span className="w-2 h-2 rounded-full bg-[#0F5E56]"></span>
								91 / 91 Automated Tests Passing (100%)
							</span>
						</div>
					</div>

					{/* Protocol Endpoints Column */}
					<div className="space-y-3">
						<div className="font-mono text-xs uppercase tracking-wider text-[#141210] font-bold">
							Protocol Rails
						</div>
						<ul className="space-y-2 text-[#5C5852] font-medium">
							<li>
								<a
									href={`${API_BASE_URL}/.well-known/agent.json`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0F5E56] transition-colors flex items-center gap-1.5"
								>
									<span>Capability Manifest</span>
									<ExternalLink className="w-3 h-3 text-[#5C5852]" />
								</a>
							</li>
							<li>
								<a
									href={`${API_BASE_URL}/products`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0F5E56] transition-colors flex items-center gap-1.5"
								>
									<span>Authoritative Catalog</span>
									<ExternalLink className="w-3 h-3 text-[#5C5852]" />
								</a>
							</li>
							<li>
								<Link href="/dashboard" className="hover:text-[#0F5E56] transition-colors">
									Live Operator Dashboard
								</Link>
							</li>
							<li>
								<a
									href={`${API_BASE_URL}/health`}
									target="_blank"
									rel="noreferrer"
									className="hover:text-[#0F5E56] transition-colors flex items-center gap-1.5"
								>
									<span>Health Check Probe</span>
									<ExternalLink className="w-3 h-3 text-[#5C5852]" />
								</a>
							</li>
						</ul>
					</div>

					{/* Track & Architecture Column */}
					<div className="space-y-3">
						<div className="font-mono text-xs uppercase tracking-wider text-[#141210] font-bold">
							Architecture
						</div>
						<ul className="space-y-2 text-[#5C5852]">
							<li>AI Growth and Agentic Commerce</li>
							<li>Payment Rail: Razorpay Orders API</li>
							<li>Firestore Immutable Audit Stream</li>
							<li>Deterministic Guardrail Rule Engine</li>
							<li>Sliding-Window Anomaly Scoring</li>
						</ul>
					</div>
				</div>

				<div className="pt-8 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C5852] font-medium">
					<div>
						Built by <span className="text-[#141210] font-bold">Mohan Prasath</span>
					</div>
					<div className="font-mono text-[11px] text-[#5C5852]">
						ACP Spec Version: 2026-04-17 | Third-Party Adapter
					</div>
				</div>
			</div>
		</footer>
	);
}

