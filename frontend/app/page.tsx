'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
	ShieldCheck,
	Activity,
	CreditCard,
	CheckCircle2,
	XCircle,
	ArrowRight,
	ArrowUpRight,
	Terminal,
	Layers,
	Lock,
	RefreshCw,
	Sparkles,
	Zap,
	Clock,
	AlertTriangle,
	ExternalLink,
	Play,
	Sliders,
	GitBranch,
	Cpu,
	Check,
	Copy,
	CheckCheck,
	Database,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentNeuralCanvas from '@/components/AgentNeuralCanvas';
import ProtocolPlayground from '@/components/ProtocolPlayground';
import { API_BASE_URL } from '@/lib/api';

export default function LandingPage() {
	const [activeQuickstartTab, setActiveQuickstartTab] = useState<'curl' | 'ts'>('curl');
	const [copiedSnippet, setCopiedSnippet] = useState(false);

	const curlQuickstart = `# 1. Register Autonomous Buyer Agent
curl -X POST ${API_BASE_URL}/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Aura Autonomous Buyer Agent #42"}'

# 2. Discover ACP Capability Manifest & Search Catalog
curl ${API_BASE_URL}/.well-known/agent.json
curl "${API_BASE_URL}/products?category=general&in_stock_only=true"

# 3. Create Checkout Session with Authoritative Pricing
curl -X POST ${API_BASE_URL}/checkout_sessions \\
  -H "X-API-Key: acp_agent_8f0a394bc..." \\
  -H "Idempotency-Key: idemp_9428591a" \\
  -H "Content-Type: application/json" \\
  -d '{
    "line_items": [{"product_id": "prod_bolt_001", "quantity": 2}],
    "buyer": {"name": "Aura Agent", "email": "aura@taskdrift.internal"}
  }'`;

	const tsQuickstart = `// Autonomous Buyer Agent ACP Client
import { ACPClient } from '@taskdrift/acp-sdk';

const client = new ACPClient({
  baseUrl: '${API_BASE_URL}',
  apiKey: process.env.ACP_AGENT_API_KEY
});

// 1. Discover capabilities
const manifest = await client.discovery.getManifest();

// 2. Query product catalog with search filters
const products = await client.catalog.search({
  category: 'general',
  inStockOnly: true
});

// 3. Create session (unit_price strictly authoritative on server)
const session = await client.checkout.createSession({
  lineItems: [{ productId: 'prod_bolt_001', quantity: 2 }],
  buyer: { name: 'Aura Agent', email: 'aura@taskdrift.internal' },
  idempotencyKey: 'idemp_unique_key_2026'
});`;

	const handleCopyQuickstart = () => {
		navigator.clipboard.writeText(activeQuickstartTab === 'curl' ? curlQuickstart : tsQuickstart);
		setCopiedSnippet(true);
		setTimeout(() => setCopiedSnippet(false), 2000);
	};

	return (
		<div className="min-h-screen bg-white text-[#0b192c] font-sans selection:bg-blue-500/20 selection:text-blue-700">
			{/* Floating Glass Navbar */}
			<Navbar />

			{/* Hero Section with Light-Theme 3D Neural Rail */}
			<section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white border-b border-slate-200/80">
				{/* Soft ambient background blooms */}
				<div
					className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-blue-200/30 via-cyan-100/20 to-transparent blur-[120px] pointer-events-none"
					aria-hidden="true"
				/>

				<div className="max-w-7xl mx-auto px-6 relative z-10">
					<div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
						{/* Protocol Spec Badge */}
						<div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0c66e4] text-xs font-mono font-bold shadow-sm">
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
							<span>Agentic Commerce Protocol (ACP) v2026-04-17</span>
							<span className="text-slate-300">|</span>
							<span className="text-slate-600 font-sans font-medium">Track 01 Spec</span>
						</div>

						{/* Main Display Headline */}
						<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0b192c] leading-[1.14]">
							The Financial Safety Rail for{' '}
							<span className="bg-gradient-to-r from-[#0c66e4] via-[#0052cc] to-[#00baf2] bg-clip-text text-transparent">
								Autonomous AI Buyer Agents
							</span>
						</h1>

						{/* Subheadline */}
						<p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-medium">
							Translates raw autonomous AI agent purchasing intents into bounded, gated, and auditable Razorpay orders.
							Enforcing server-authoritative pricing, deterministic guardrails, 30-min inventory soft-holds, and
							zero-hallucination checkouts.
						</p>

						{/* Dual CTAs */}
						<div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
							<Link
								href="/dashboard"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-[#0c66e4] hover:bg-[#0052cc] shadow-lg shadow-blue-500/25 border border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
							>
								<Activity className="w-4 h-4 text-blue-100" />
								<span>Launch Live Dashboard</span>
								<ArrowRight className="w-4 h-4 text-blue-100" />
							</Link>

							<a
								href="#playground"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
							>
								<Terminal className="w-4 h-4 text-[#0c66e4]" />
								<span>Explore Live Sandbox</span>
							</a>
						</div>
					</div>

					{/* 3D WebGL Neural Canvas Visual (Light Theme) */}
					<div className="mt-12 pt-2 relative max-w-5xl mx-auto">
						<AgentNeuralCanvas />
					</div>

					{/* Live Stat Bar (Crisp White Cards) */}
					<div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
						<div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
							<div className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider">
								AUTOMATED TESTS
							</div>
							<div className="text-2xl font-extrabold text-[#059669] font-mono mt-1">91 / 91</div>
							<div className="text-xs text-slate-500 font-medium mt-0.5">100% Pytest Pass Rate</div>
						</div>

						<div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
							<div className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider">
								DETERMINISTIC CEILING
							</div>
							<div className="text-2xl font-extrabold text-[#0c66e4] font-mono mt-1">Max 50%</div>
							<div className="text-xs text-slate-500 font-medium mt-0.5">₹50,000 Order Value Limit</div>
						</div>

						<div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
							<div className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider">
								INVENTORY SOFT-HOLD
							</div>
							<div className="text-2xl font-extrabold text-[#7c3aed] font-mono mt-1">30-Min TTL</div>
							<div className="text-xs text-slate-500 font-medium mt-0.5">Automated Sweeper & Release</div>
						</div>

						<div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
							<div className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider">
								GATEWAY CRYPTOGRAPHY
							</div>
							<div className="text-2xl font-extrabold text-[#0284c7] font-mono mt-1">HMAC-SHA256</div>
							<div className="text-xs text-slate-500 font-medium mt-0.5">Inbound & Outbound Rails</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section: The Problem & The Solution */}
			<section id="problem-solution" className="py-24 max-w-7xl mx-auto px-6 space-y-12">
				<div className="text-center space-y-3 max-w-2xl mx-auto">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0c66e4] font-bold">
						Why an Adapter is Critical
					</div>
					<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
						The Vulnerability in Direct Agentic Payments
					</h2>
					<p className="text-sm text-slate-600 leading-relaxed font-medium">
						Giving autonomous AI buyer agents direct API keys to payment gateways introduces existential financial risks
						for merchants. The ACP adapter introduces an immutable safety perimeter.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* Unprotected Side */}
					<div className="p-8 rounded-3xl bg-rose-50/50 border border-rose-200 space-y-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5 text-rose-700 font-bold text-sm">
								<XCircle className="w-5 h-5" />
								<span>Direct Gateway Integration (Unprotected)</span>
							</div>
							<span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
								High Risk
							</span>
						</div>

						<ul className="space-y-4 text-xs text-slate-700">
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Price Tampering & Hallucinations:</strong> Rogue or
									hallucinating agents inject arbitrary client prices (e.g. ₹1 for a ₹4,999 SKU) when gateways lack
									catalog authority.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Unbounded Balance Sheet Exposure:</strong> No hard
									mathematical limits prevent prompt-injected agents from over-ordering beyond credit boundaries or
									abusing discounts.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Inventory Race Conditions:</strong> Multi-turn agent
									negotiations double-book low-stock items without transactional locks.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Zero Explainable Auditability:</strong> Rejected or
									aborted sessions vanish without persistent before/after logs and mathematical violation reasons.
								</span>
							</li>
						</ul>
					</div>

					{/* Protected Side */}
					<div className="p-8 rounded-3xl bg-emerald-50/50 border border-emerald-200 space-y-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
								<CheckCircle2 className="w-5 h-5" />
								<span>Razorpay ACP Checkout Adapter</span>
							</div>
							<span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
								Zero-Hallucination Safe
							</span>
						</div>

						<ul className="space-y-4 text-xs text-slate-700">
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Server-Authoritative Pricing:</strong> Client unit prices
									are discarded. Catalog lookups and Indian GST slabs (12%, 18%, 28%) are calculated authoritatively on the
									server.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Deterministic Guardrails:</strong> Hard merchant limits
									(max 50% discount, ₹50,000 order total, 10 units/SKU) deterministically reject violations before money
									moves.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">30-Min Soft-Hold Reservations:</strong> Stock is reserved
									during negotiations and automatically released if an agent abandons or cancels.
								</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></span>
								<span>
									<strong className="text-slate-900 font-semibold">Immutable Firestore Audit Stream:</strong> Every state
									change, actor identity, and rejection reason is permanently recorded with before/after totals.
								</span>
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* Section: Architectural Pillars */}
			<section id="pillars" className="py-24 bg-slate-50 border-y border-slate-200">
				<div className="max-w-7xl mx-auto px-6 space-y-12">
					<div className="text-center space-y-3 max-w-2xl mx-auto">
						<div className="font-mono text-xs uppercase tracking-wider text-[#0c66e4] font-bold">
							Core Technical Pillars
						</div>
						<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
							Engineered for Protocol Depth & Financial Safety
						</h2>
						<p className="text-sm text-slate-600 leading-relaxed font-medium">
							Dual-engineered for AI developers seeking standardized ACP compliance and merchants demanding zero
							financial leakage.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Pillar 1 */}
						<div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all group">
							<div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0c66e4] group-hover:scale-105 transition-transform">
								<Zap className="w-6 h-6" />
							</div>
							<h3 className="text-base font-bold text-[#0b192c]">Authoritative Pricing</h3>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Client <code className="text-slate-800 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">unit_price</code> inputs are discarded. Taxes are
								calculated per line-item across Indian GST slabs with proportional pre-tax discount allocation without
								cent drift.
							</p>
							<div className="pt-2 font-mono text-[11px] text-[#0c66e4] font-bold flex items-center gap-1">
								<span>pricing.py // GST Slabs</span>
								<ArrowRight className="w-3 h-3" />
							</div>
						</div>

						{/* Pillar 2 */}
						<div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all group">
							<div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#7c3aed] group-hover:scale-105 transition-transform">
								<Lock className="w-6 h-6" />
							</div>
							<h3 className="text-base font-bold text-[#0b192c]">Deterministic Guardrails</h3>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Hard mathematical limits (Max 50% discount, ₹50,000 order total, 10 units/SKU). Anomaly scoring engine
								tracks velocity and hard-blocks abusive traffic patterns.
							</p>
							<div className="pt-2 font-mono text-[11px] text-[#7c3aed] font-bold flex items-center gap-1">
								<span>guardrails.py // Zero LLM</span>
								<ArrowRight className="w-3 h-3" />
							</div>
						</div>

						{/* Pillar 3 */}
						<div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all group">
							<div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] group-hover:scale-105 transition-transform">
								<Clock className="w-6 h-6" />
							</div>
							<h3 className="text-base font-bold text-[#0b192c]">Soft-Hold Inventory</h3>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Sessions soft-hold stock upon creation. Open sessions expire after a 30-minute TTL, triggering automated
								sweeper release (<code className="text-slate-800 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">/internal/sweep_expired</code>).
							</p>
							<div className="pt-2 font-mono text-[11px] text-[#059669] font-bold flex items-center gap-1">
								<span>inventory.py // 30m TTL</span>
								<ArrowRight className="w-3 h-3" />
							</div>
						</div>

						{/* Pillar 4 */}
						<div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all group">
							<div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#0284c7] group-hover:scale-105 transition-transform">
								<ShieldCheck className="w-6 h-6" />
							</div>
							<h3 className="text-base font-bold text-[#0b192c]">Cryptographic Rails</h3>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Inbound Razorpay webhooks verified with HMAC-SHA256 constant-time comparison. Outbound events dispatch
								with backoff retry and persistent dead-letter queue logging.
							</p>
							<div className="pt-2 font-mono text-[11px] text-[#0284c7] font-bold flex items-center gap-1">
								<span>webhooks.py // DeadLetter</span>
								<ArrowRight className="w-3 h-3" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section: Interactive Protocol Playground */}
			<section id="playground" className="py-24 max-w-7xl mx-auto px-6 space-y-8">
				<div className="text-center space-y-3 max-w-2xl mx-auto">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0c66e4] font-bold">
						Interactive Protocol Sandbox
					</div>
					<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
						Simulate Autonomous Buyer Scenarios
					</h2>
					<p className="text-sm text-slate-600 leading-relaxed font-medium">
						Experience live checkout session state transitions, price-tampering defense, discount ceiling enforcement,
						and TTL sweeper mechanics directly from the adapter's test suite.
					</p>
				</div>

				<ProtocolPlayground />
			</section>

			{/* Section: Finite State Machine (FSM) Lifecycle */}
			<section id="lifecycle" className="py-24 bg-slate-50 border-y border-slate-200">
				<div className="max-w-7xl mx-auto px-6 space-y-12">
					<div className="text-center space-y-3 max-w-2xl mx-auto">
						<div className="font-mono text-xs uppercase tracking-wider text-[#7c3aed] font-bold">
							Session Lifecycle Architecture
						</div>
						<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
							Deterministic Finite State Machine (FSM)
						</h2>
						<p className="text-sm text-slate-600 leading-relaxed font-medium">
							Checkout sessions transition strictly through deterministic states. Completed, rejected, refunded, and
							cancelled states are terminal and cryptographically locked against further mutations.
						</p>
					</div>

					{/* Step sequence */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#0c66e4] font-bold">STATE 01</span>
								<span className="px-2 py-0.5 rounded bg-blue-50 text-[#0c66e4] border border-blue-200 font-bold">created</span>
							</div>
							<h4 className="text-sm font-bold text-[#0b192c]">Cart Initialized</h4>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Authoritative totals calculated. 30-min TTL timestamp assigned. Soft-hold inventory reserved.
							</p>
						</div>

						<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#4f46e5] font-bold">STATE 02</span>
								<span className="px-2 py-0.5 rounded bg-indigo-50 text-[#4f46e5] border border-indigo-200 font-bold">updated</span>
							</div>
							<h4 className="text-sm font-bold text-[#0b192c]">Negotiation & Patching</h4>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Agent modifies item quantities or applies coupon codes. Guardrail bounds re-evaluated on each turn.
							</p>
						</div>

						<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#0284c7] font-bold">STATE 03</span>
								<span className="px-2 py-0.5 rounded bg-cyan-50 text-[#0284c7] border border-cyan-200 font-bold">ready_for_payment</span>
							</div>
							<h4 className="text-sm font-bold text-[#0b192c]">Delegated Token Bound</h4>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Full shipping address provided. Agent attaches delegated token (<code className="text-slate-800 font-mono font-bold">pm_tok_*</code>).
							</p>
						</div>

						<div className="p-6 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-sm space-y-2">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#059669] font-bold">STATE 04</span>
								<span className="px-2 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-200 font-bold">completed</span>
							</div>
							<h4 className="text-sm font-bold text-[#0b192c]">Razorpay Rail Bridge</h4>
							<p className="text-xs text-slate-600 leading-relaxed font-medium">
								Inventory committed. Razorpay order created (<code className="text-slate-800 font-mono font-bold">order_*</code>).
								Immutable audit entry written.
							</p>
						</div>
					</div>

					{/* Terminal Exception States */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
						<div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start gap-3">
							<XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
							<div className="space-y-1">
								<div className="text-xs font-bold text-rose-800 font-mono">TERMINAL: rejected</div>
								<p className="text-xs text-slate-700 font-medium leading-relaxed">
									Triggered on guardrail breach (discount &gt;50%, total &gt;₹50k, qty &gt;10). Session locked and
									unpayable.
								</p>
							</div>
						</div>

						<div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
							<AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
							<div className="space-y-1">
								<div className="text-xs font-bold text-amber-800 font-mono">TERMINAL: cancelled</div>
								<p className="text-xs text-slate-700 font-medium leading-relaxed">
									Triggered by explicit cancellation or 30-min TTL expiry sweep. Soft-held inventory returned to stock.
								</p>
							</div>
						</div>

						<div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
							<RefreshCw className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
							<div className="space-y-1">
								<div className="text-xs font-bold text-purple-800 font-mono">TERMINAL: refunded</div>
								<p className="text-xs text-slate-700 font-medium leading-relaxed">
									Post-payment reversal calling Razorpay Refund API. Locks session into audited refunded state.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section: Developer Quickstart */}
			<section id="quickstart" className="py-24 max-w-7xl mx-auto px-6 space-y-10">
				<div className="text-center space-y-3 max-w-2xl mx-auto">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0c66e4] font-bold">
						Developer Quickstart
					</div>
					<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
						Integrate with Any Autonomous Agent
					</h2>
					<p className="text-sm text-slate-600 leading-relaxed font-medium">
						Standardized HTTP endpoints matching Agentic Commerce Protocol <code className="text-slate-800 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">v2026-04-17</code>.
						Works out of the box with LangChain, AutoGen, CrewAI, or standalone custom buyer scripts.
					</p>
				</div>

				<div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-razorpay max-w-4xl mx-auto">
					<div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								onClick={() => setActiveQuickstartTab('curl')}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
									activeQuickstartTab === 'curl'
										? 'bg-[#0c66e4] text-white shadow-sm'
										: 'text-slate-600 hover:text-black bg-white border border-slate-200'
								}`}
							>
								cURL
							</button>
							<button
								onClick={() => setActiveQuickstartTab('ts')}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
									activeQuickstartTab === 'ts'
										? 'bg-[#0c66e4] text-white shadow-sm'
										: 'text-slate-600 hover:text-black bg-white border border-slate-200'
								}`}
							>
								TypeScript SDK
							</button>
						</div>

						<button
							onClick={handleCopyQuickstart}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-semibold transition-colors border border-slate-200"
						>
							{copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
							<span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
						</button>
					</div>

					<div className="p-6 bg-[#0a1224] overflow-x-auto text-xs font-mono leading-relaxed">
						<pre className="text-slate-200">
							<code>{activeQuickstartTab === 'curl' ? curlQuickstart : tsQuickstart}</code>
						</pre>
					</div>
				</div>
			</section>

			{/* Section: Bottom Conversion Banner */}
			<section className="py-20 bg-gradient-to-b from-white to-blue-50/60 border-t border-slate-200">
				<div className="max-w-4xl mx-auto px-6 text-center space-y-6">
					<div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0c66e4] to-[#00baf2] p-0.5 mx-auto shadow-md shadow-blue-500/20 flex items-center justify-center">
						<div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
							<ShieldCheck className="w-7 h-7 text-[#0c66e4]" />
						</div>
					</div>

					<h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
						Ready to inspect live autonomous transactions?
					</h2>
					<p className="text-slate-600 text-sm max-w-xl mx-auto leading-relaxed font-medium">
						Open the live audit dashboard to watch autonomous buyer agents negotiate carts, trigger guardrail attacks,
						and bridge transactions into Razorpay orders in real time.
					</p>

					<div className="pt-3">
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white bg-[#0c66e4] hover:bg-[#0052cc] shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-[0.98]"
						>
							<Activity className="w-4 h-4" />
							<span>Open Live Audit Dashboard</span>
							<ArrowUpRight className="w-4 h-4" />
						</Link>
					</div>
				</div>
			</section>

			{/* Technical Footer */}
			<Footer />
		</div>
	);
}
