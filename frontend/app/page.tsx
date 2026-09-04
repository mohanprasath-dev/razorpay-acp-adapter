'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
	Activity,
	ArrowRight,
	ArrowUpRight,
	Terminal,
	Layers,
	Lock,
	Check,
	Copy,
	Zap,
	Clock,
	ShieldCheck,
	Sliders,
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

# 2. Discover ACP Capability Manifest and Search Catalog
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
		<div className="min-h-screen bg-[#FAF9F6] text-[#141210] font-sans selection:bg-[#0F5E56]/15 selection:text-[#0F5E56]">
			{/* Persistent Header */}
			<Navbar />

			{/* Hero Section */}
			<section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-[#E8E5DF]">
				<div className="max-w-7xl mx-auto px-6 relative z-10">
					<div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
						{/* Protocol and Rail Badges */}
						<div className="flex flex-wrap items-center justify-center gap-2.5">
							<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E6F0EE] border border-[#C5D8D4] text-[#0F5E56] text-xs font-mono font-medium">
								<span className="w-1.5 h-1.5 rounded-full bg-[#0F5E56]"></span>
								<span>ACP v2026-04-17 Spec</span>
								<span className="text-[#A3BEBA]">|</span>
								<span className="text-[#141210] font-semibold">Track 01</span>
							</div>
							<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E8E5DF] text-[#5C5852] text-xs font-mono font-medium shadow-sm">
								<span>Payment rail: Razorpay</span>
							</div>
						</div>

						{/* Main Editorial Display Headline in Fraunces */}
						<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#141210] leading-[1.12]">
							ACP-Compliant Checkout Rail for{' '}
							<span className="italic text-[#0F5E56]">Autonomous AI</span> Buyer Agents
						</h1>

						{/* Subheadline */}
						<p className="text-base sm:text-lg text-[#5C5852] max-w-2xl leading-relaxed font-normal">
							Translates raw autonomous AI agent purchasing intents into bounded, gated, and auditable
							orders on the Razorpay rail. Enforcing server-authoritative catalog pricing, deterministic
							guardrails, 30-min inventory soft-holds, and zero-hallucination checkouts.
						</p>

						{/* Dual CTAs in Deep Teal & Neutral Frame */}
						<div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
							<Link
								href="/dashboard"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-white bg-[#0F5E56] hover:bg-[#09433D] transition-all shadow-sm active:scale-[0.98]"
							>
								<Activity className="w-4 h-4 text-[#E6F0EE]" />
								<span>Launch Live Dashboard</span>
								<ArrowRight className="w-4 h-4 text-[#E6F0EE]" />
							</Link>

							<a
								href="#playground"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#141210] bg-white hover:bg-[#F4F1EC] border border-[#E8E5DF] transition-all shadow-sm"
							>
								<Terminal className="w-4 h-4 text-[#0F5E56]" />
								<span>Protocol Sandbox</span>
							</a>
						</div>
					</div>

					{/* Rebuilt 3D WebGL Neural Canvas Visual */}
					<div className="mt-12 pt-2 relative max-w-5xl mx-auto">
						<AgentNeuralCanvas />
					</div>

					{/* Live Stat Bar (Editorial Technical Panels) */}
					<div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
							<div className="text-[11px] text-[#5C5852] font-mono font-medium uppercase tracking-wider">
								01 // TEST SUITE
							</div>
							<div className="text-2xl font-bold text-[#0F5E56] font-mono mt-1">91 / 91</div>
							<div className="text-xs text-[#5C5852] font-normal mt-0.5">100% Pytest Pass Rate</div>
						</div>

						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
							<div className="text-[11px] text-[#5C5852] font-mono font-medium uppercase tracking-wider">
								02 // GUARDRAIL CEILING
							</div>
							<div className="text-2xl font-bold text-[#141210] font-mono mt-1">Max 50%</div>
							<div className="text-xs text-[#5C5852] font-normal mt-0.5">Rs 50,000 Order Limit</div>
						</div>

						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
							<div className="text-[11px] text-[#5C5852] font-mono font-medium uppercase tracking-wider">
								03 // INVENTORY HOLD
							</div>
							<div className="text-2xl font-bold text-[#0F5E56] font-mono mt-1">30-Min TTL</div>
							<div className="text-xs text-[#5C5852] font-normal mt-0.5">Automated Sweeper Release</div>
						</div>

						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge">
							<div className="text-[11px] text-[#5C5852] font-mono font-medium uppercase tracking-wider">
								04 // GATEWAY SECURITY
							</div>
							<div className="text-2xl font-bold text-[#141210] font-mono mt-1">HMAC-SHA256</div>
							<div className="text-xs text-[#5C5852] font-normal mt-0.5">Inbound and Outbound Rails</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section: The Problem and Solution (Single Column Before/After Table) */}
			<section id="problem-solution" className="py-24 max-w-5xl mx-auto px-6 space-y-12">
				<div className="space-y-3">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold">
						Architectural Rationale
					</div>
					<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
						The Vulnerability in Direct Agentic Payments
					</h2>
					<p className="text-sm text-[#5C5852] leading-relaxed max-w-2xl font-normal">
						Giving autonomous buyer agents direct API keys to merchant payment gateways exposes balance sheets
						to prompt injections, cart hallucinations, and race conditions. AgentPay Bridge installs an immutable
						verification layer between agent intents and money movement.
					</p>
				</div>

				{/* Single-Column Editorial Comparison Table */}
				<div className="rounded-2xl border border-[#E8E5DF] bg-white divide-y divide-[#E8E5DF] shadow-bridge overflow-hidden">
					{/* Header Row */}
					<div className="grid grid-cols-1 md:grid-cols-2 p-5 bg-[#FAF9F6] text-xs font-mono uppercase tracking-wider text-[#5C5852]">
						<div className="font-semibold text-[#8C8880]">Direct Gateway Integration (Unprotected)</div>
						<div className="mt-2 md:mt-0 font-semibold text-[#0F5E56]">AgentPay Bridge Adapter (Protected)</div>
					</div>

					{/* Item 1: Catalog Pricing Authority */}
					<div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 items-start">
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#8C8880] uppercase tracking-wider">
								[-] Price Tampering and Hallucinations
							</div>
							<p className="text-[#5C5852] leading-relaxed">
								Autonomous agents inject arbitrary client prices (e.g. Rs 1 for a Rs 4,999 SKU). Gateways lacking
								catalog authority blindly charge the requested amount without cross-referencing inventory databases.
							</p>
						</div>
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#0F5E56] uppercase tracking-wider font-semibold flex items-center gap-1.5">
								<Check className="w-3.5 h-3.5 text-[#0F5E56]" />
								<span>Server-Authoritative Catalog Slabs</span>
							</div>
							<p className="text-[#141210] font-medium leading-relaxed">
								Client unit prices are strictly discarded. Catalog lookups and Indian GST slabs (12%, 18%, 28%)
								are calculated deterministically on the server with proportional discount allocation.
							</p>
						</div>
					</div>

					{/* Item 2: Financial Guardrail Bounds */}
					<div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 items-start">
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#8C8880] uppercase tracking-wider">
								[-] Unbounded Financial Exposure
							</div>
							<p className="text-[#5C5852] leading-relaxed">
								Prompt-injected or looping agents can execute excessive bulk purchases or stack unverified
								promotions beyond merchant risk tolerances.
							</p>
						</div>
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#0F5E56] uppercase tracking-wider font-semibold flex items-center gap-1.5">
								<Check className="w-3.5 h-3.5 text-[#0F5E56]" />
								<span>Deterministic Rule Engine and Anomaly Scoring</span>
							</div>
							<p className="text-[#141210] font-medium leading-relaxed">
								Hard merchant limits (max 50% discount, Rs 50,000 order total, 10 units/SKU) and sliding-window
								anomaly velocity checks hard-block malicious transactions before session completion.
							</p>
						</div>
					</div>

					{/* Item 3: Inventory Soft-Holds */}
					<div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 items-start">
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#8C8880] uppercase tracking-wider">
								[-] Inventory Race Conditions and Phantom Locks
							</div>
							<p className="text-[#5C5852] leading-relaxed">
								Multi-turn agent negotiations double-book scarce stock, or abandon checkout sessions mid-flow
								leaving merchandise locked indefinitely.
							</p>
						</div>
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#0F5E56] uppercase tracking-wider font-semibold flex items-center gap-1.5">
								<Check className="w-3.5 h-3.5 text-[#0F5E56]" />
								<span>30-Minute TTL Reservations and Sweeper</span>
							</div>
							<p className="text-[#141210] font-medium leading-relaxed">
								Sessions soft-hold stock during negotiation. Uncompleted sessions automatically expire after 30
								minutes, and a dedicated sweeper safely returns inventory to stock.
							</p>
						</div>
					</div>

					{/* Item 4: Audit Stream */}
					<div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 items-start">
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#8C8880] uppercase tracking-wider">
								[-] Zero Explainable Operator Auditability
							</div>
							<p className="text-[#5C5852] leading-relaxed">
								Rejected sessions and price corrections vanish into unformatted log streams, preventing human
								merchants from auditing automated agent behavior.
							</p>
						</div>
						<div className="space-y-1 text-xs">
							<div className="font-mono text-[11px] text-[#0F5E56] uppercase tracking-wider font-semibold flex items-center gap-1.5">
								<Check className="w-3.5 h-3.5 text-[#0F5E56]" />
								<span>Immutable Structured Firestore Audit Trail</span>
							</div>
							<p className="text-[#141210] font-medium leading-relaxed">
								Every state mutation, agent identity, rejection reason, and before/after cart total is written
								immutably to Firestore and viewable in real time.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Section: Architectural Pillars (Asymmetric Editorial Layout with 01, 02, 03, 04) */}
			<section id="pillars" className="py-24 border-y border-[#E8E5DF] bg-[#FAF9F6]">
				<div className="max-w-7xl mx-auto px-6 space-y-16">
					<div className="space-y-3 max-w-2xl">
						<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold">
							Core Technical Pillars
						</div>
						<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
							Engineered for Protocol Precision and Safety
						</h2>
						<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
							Dual-engineered for AI developers building standardized ACP agent clients and merchants demanding
							bulletproof balance-sheet protection.
						</p>
					</div>

					{/* Row 1: 7-col / 5-col split */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
						{/* Pillar 01 */}
						<div className="lg:col-span-7 p-8 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge flex flex-col justify-between space-y-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="font-serif text-3xl font-bold text-[#0F5E56]">01</span>
									<span className="font-mono text-xs text-[#5C5852] bg-[#F4F1EC] px-2.5 py-1 rounded border border-[#E8E5DF]">
										pricing.py // GST Slabs
									</span>
								</div>
								<h3 className="text-xl font-serif font-bold text-[#141210]">
									Server-Authoritative Pricing and Indian Tax Slabs
								</h3>
								<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
									Client-submitted unit prices are ignored. The adapter queries the server catalog for authoritative
									prices and executes Indian GST slab calculations (12%, 18%, 28%) with proportional pre-tax
									discount allocation, ensuring zero paise drift across multi-item orders.
								</p>
							</div>
							<div className="pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-xs font-mono text-[#5C5852]">
								<span>ALGORITHM: PROPORTIONAL TAX SPREAD</span>
								<span className="font-semibold text-[#0F5E56]">DETERMINISTIC</span>
							</div>
						</div>

						{/* Pillar 02 */}
						<div className="lg:col-span-5 p-8 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge flex flex-col justify-between space-y-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="font-serif text-3xl font-bold text-[#0F5E56]">02</span>
									<span className="font-mono text-xs text-[#5C5852] bg-[#F4F1EC] px-2.5 py-1 rounded border border-[#E8E5DF]">
										guardrails.py // Non-LLM
									</span>
								</div>
								<h3 className="text-xl font-serif font-bold text-[#141210]">
									Deterministic Guardrails and Anomaly Engine
								</h3>
								<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
									Hard mathematical ceilings (Max 50% discount, Rs 50,000 order total, 10 units/SKU). A sliding-window
									anomaly scoring engine tracks agent velocity to prevent abusive flash-buying without relying on
									unpredictable LLM evaluators.
								</p>
							</div>
							<div className="pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-xs font-mono text-[#5C5852]">
								<span>LATENCY: ZERO LLM HOPS</span>
								<span className="font-semibold text-[#0F5E56]">&lt; 2MS EVALUATION</span>
							</div>
						</div>
					</div>

					{/* Row 2: 5-col / 7-col split */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
						{/* Pillar 03 */}
						<div className="lg:col-span-5 p-8 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge flex flex-col justify-between space-y-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="font-serif text-3xl font-bold text-[#0F5E56]">03</span>
									<span className="font-mono text-xs text-[#5C5852] bg-[#F4F1EC] px-2.5 py-1 rounded border border-[#E8E5DF]">
										inventory.py // 30m TTL
									</span>
								</div>
								<h3 className="text-xl font-serif font-bold text-[#141210]">
									Soft-Hold Inventory and Expiry Sweeper
								</h3>
								<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
									Stock is soft-reserved upon checkout session creation to prevent double-booking. Sessions not
									completed within 30 minutes expire automatically, triggering the sweeper endpoint to safely release
									merchandise back to available inventory.
								</p>
							</div>
							<div className="pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-xs font-mono text-[#5C5852]">
								<span>TTL: 1800 SECONDS</span>
								<span className="font-semibold text-[#0F5E56]">AUTOMATED RESTOCK</span>
							</div>
						</div>

						{/* Pillar 04 */}
						<div className="lg:col-span-7 p-8 rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge flex flex-col justify-between space-y-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="font-serif text-3xl font-bold text-[#0F5E56]">04</span>
									<span className="font-mono text-xs text-[#5C5852] bg-[#F4F1EC] px-2.5 py-1 rounded border border-[#E8E5DF]">
										webhooks.py // DeadLetter
									</span>
								</div>
								<h3 className="text-xl font-serif font-bold text-[#141210]">
									Cryptographic Rails and Reliable Webhooks
								</h3>
								<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
									Inbound Razorpay webhooks are verified with HMAC-SHA256 constant-time signature comparison.
									Outbound webhook events dispatch to agent listeners with exponential backoff retries and
									dead-letter queue logging on delivery failures.
								</p>
							</div>
							<div className="pt-4 border-t border-[#E8E5DF] flex items-center justify-between text-xs font-mono text-[#5C5852]">
								<span>SECURITY: HMAC-SHA256</span>
								<span className="font-semibold text-[#0F5E56]">IDEMPOTENT RAILS</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section: Interactive Protocol Playground */}
			<section id="playground" className="py-24 max-w-7xl mx-auto px-6 space-y-8">
				<div className="space-y-3 max-w-2xl">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold">
						Protocol Sandbox Simulator
					</div>
					<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
						Simulate Autonomous Buyer Scenarios
					</h2>
					<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
						Experience live checkout session state transitions, price-tampering defense, discount ceiling enforcement,
						and TTL sweeper mechanics directly from the adapter's test suite.
					</p>
				</div>

				<ProtocolPlayground />
			</section>

			{/* Section: Finite State Machine (FSM) Lifecycle */}
			<section id="lifecycle" className="py-24 border-y border-[#E8E5DF] bg-[#FAF9F6]">
				<div className="max-w-7xl mx-auto px-6 space-y-12">
					<div className="space-y-3 max-w-2xl">
						<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold">
							Session Lifecycle Architecture
						</div>
						<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
							Deterministic Finite State Machine (FSM)
						</h2>
						<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
							Checkout sessions transition strictly through deterministic states. Completed, rejected, refunded, and
							cancelled states are terminal and cryptographically locked against further mutations.
						</p>
					</div>

					{/* Step sequence */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="p-6 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-3">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#0F5E56] font-bold">STATE 01</span>
								<span className="px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-semibold">
									created
								</span>
							</div>
							<h4 className="text-sm font-bold text-[#141210]">Cart Initialized</h4>
							<p className="text-xs text-[#5C5852] leading-relaxed font-normal">
								Authoritative totals calculated. 30-min TTL timestamp assigned. Soft-hold inventory reserved.
							</p>
						</div>

						<div className="p-6 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-3">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#141210] font-bold">STATE 02</span>
								<span className="px-2 py-0.5 rounded bg-[#F4F1EC] text-[#141210] border border-[#E8E5DF] font-semibold">
									updated
								</span>
							</div>
							<h4 className="text-sm font-bold text-[#141210]">Negotiation and Patching</h4>
							<p className="text-xs text-[#5C5852] leading-relaxed font-normal">
								Agent modifies item quantities or applies coupon codes. Guardrail bounds re-evaluated on each turn.
							</p>
						</div>

						<div className="p-6 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-3">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#141210] font-bold">STATE 03</span>
								<span className="px-2 py-0.5 rounded bg-[#F4F1EC] text-[#141210] border border-[#E8E5DF] font-semibold">
									ready_for_payment
								</span>
							</div>
							<h4 className="text-sm font-bold text-[#141210]">Delegated Token Attached</h4>
							<p className="text-xs text-[#5C5852] leading-relaxed font-normal">
								Full shipping address provided. Agent attaches delegated token (pm_tok_*).
							</p>
						</div>

						<div className="p-6 rounded-xl bg-white border-2 border-[#0F5E56] shadow-bridge space-y-3">
							<div className="flex items-center justify-between text-xs font-mono">
								<span className="text-[#0F5E56] font-bold">STATE 04</span>
								<span className="px-2 py-0.5 rounded bg-[#0F5E56] text-white font-semibold">
									completed
								</span>
							</div>
							<h4 className="text-sm font-bold text-[#141210]">Razorpay Order Bridged</h4>
							<p className="text-xs text-[#5C5852] leading-relaxed font-normal">
								Inventory committed. Razorpay order created (order_*). Immutable audit entry written.
							</p>
						</div>
					</div>

					{/* Terminal Exception States */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-2">
							<div className="text-xs font-bold text-[#C4602A] font-mono uppercase">TERMINAL: rejected</div>
							<p className="text-xs text-[#5C5852] font-normal leading-relaxed">
								Triggered on guardrail breach (discount &gt; 50%, total &gt; Rs 50k, qty &gt; 10). Session locked and unpayable.
							</p>
						</div>

						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-2">
							<div className="text-xs font-bold text-[#5C5852] font-mono uppercase">TERMINAL: cancelled</div>
							<p className="text-xs text-[#5C5852] font-normal leading-relaxed">
								Triggered by explicit agent cancellation or 30-min TTL expiry sweep. Soft-held stock returned to available catalog.
							</p>
						</div>

						<div className="p-5 rounded-xl bg-white border border-[#E8E5DF] shadow-bridge space-y-2">
							<div className="text-xs font-bold text-[#141210] font-mono uppercase">TERMINAL: refunded</div>
							<p className="text-xs text-[#5C5852] font-normal leading-relaxed">
								Post-payment reversal calling Razorpay Refund API. Locks session into audited refunded state.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Section: Developer Quickstart */}
			<section id="quickstart" className="py-24 max-w-5xl mx-auto px-6 space-y-10">
				<div className="space-y-3">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold">
						Developer Quickstart
					</div>
					<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
						Integrate with Any Autonomous Buyer Agent
					</h2>
					<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
						Standardized HTTP endpoints matching Agentic Commerce Protocol v2026-04-17.
						Compatible with LangChain, AutoGen, CrewAI, or standalone custom buyer scripts.
					</p>
				</div>

				<div className="rounded-2xl bg-white border border-[#E8E5DF] overflow-hidden shadow-bridge">
					<div className="p-4 border-b border-[#E8E5DF] bg-[#FAF9F6] flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								onClick={() => setActiveQuickstartTab('curl')}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
									activeQuickstartTab === 'curl'
										? 'bg-[#0F5E56] text-white shadow-sm'
										: 'text-[#5C5852] hover:text-[#141210] bg-white border border-[#E8E5DF]'
								}`}
							>
								cURL
							</button>
							<button
								onClick={() => setActiveQuickstartTab('ts')}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
									activeQuickstartTab === 'ts'
										? 'bg-[#0F5E56] text-white shadow-sm'
										: 'text-[#5C5852] hover:text-[#141210] bg-white border border-[#E8E5DF]'
								}`}
							>
								TypeScript SDK
							</button>
						</div>

						<button
							onClick={handleCopyQuickstart}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4F1EC] text-[#141210] text-xs font-mono font-semibold transition-colors border border-[#E8E5DF]"
						>
							{copiedSnippet ? <Check className="w-3.5 h-3.5 text-[#0F5E56]" /> : <Copy className="w-3.5 h-3.5" />}
							<span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
						</button>
					</div>

					<div className="p-6 bg-[#121817] overflow-x-auto text-xs font-mono leading-relaxed">
						<pre className="text-[#E2DED7]">
							<code>{activeQuickstartTab === 'curl' ? curlQuickstart : tsQuickstart}</code>
						</pre>
					</div>
				</div>
			</section>

			{/* Section: Bottom Conversion Banner */}
			<section className="py-20 border-t border-[#E8E5DF] bg-white">
				<div className="max-w-4xl mx-auto px-6 text-center space-y-6">
					<div className="w-12 h-12 rounded-xl bg-[#0F5E56] p-0.5 mx-auto shadow-sm flex items-center justify-center text-white">
						<ShieldCheck className="w-6 h-6 text-white" />
					</div>

					<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
						Inspect Live Autonomous Transactions
					</h2>
					<p className="text-[#5C5852] text-sm max-w-xl mx-auto leading-relaxed font-normal">
						Open the live audit dashboard to observe autonomous buyer agents negotiate carts, trigger
						deterministic guardrails, and bridge transactions into Razorpay orders.
					</p>

					<div className="pt-2">
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-white bg-[#0F5E56] hover:bg-[#09433D] shadow-sm transition-all active:scale-[0.98]"
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

