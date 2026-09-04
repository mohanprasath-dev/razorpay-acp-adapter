'use client';

import React, { useState } from 'react';
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	RefreshCw,
	Copy,
	Check,
	Terminal,
	Code,
	Zap,
	Lock,
	ArrowRight,
	Play,
} from 'lucide-react';

interface Scenario {
	id: string;
	title: string;
	shortTitle: string;
	badge: string;
	badgeColor: string;
	description: string;
	method: 'POST' | 'GET';
	endpoint: string;
	requestJson: any;
	responseStatus: number;
	responseJson: any;
	curl: string;
}

const SCENARIOS: Scenario[] = [
	{
		id: 'happy-path',
		title: 'Standard Autonomous Checkout Flow',
		shortTitle: '1. Happy Path Purchase',
		badge: 'ACT 2 // FULL COMPLETION',
		badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
		description: 'Autonomous buyer agent negotiates 2 items, applies valid promotional discount, attaches tokenized payment method (pm_tok_*), and bridges to Razorpay Orders API.',
		method: 'POST',
		endpoint: '/checkout_sessions/cs_e44bcc71/complete',
		requestJson: {
			line_items: [
				{ product_id: 'prod_bolt_001', quantity: 2 },
				{ product_id: 'prod_bolt_004', quantity: 1 }
			],
			buyer: {
				name: 'Aura Autonomous Buyer Agent #42',
				email: 'aura.agent@taskdrift.internal'
			},
			fulfillment_address: {
				line1: 'Prestige Tech Cloud, Block 2',
				city: 'Bengaluru',
				state: 'Karnataka',
				postal_code: '560103',
				country: 'IN'
			},
			discount: 100.0,
			payment_method_token: 'pm_tok_4a6cac8efad54c5d'
		},
		responseStatus: 200,
		responseJson: {
			id: 'cs_e44bcc7178a943f8',
			status: 'completed',
			line_items: [
				{ product_id: 'prod_bolt_001', quantity: 2, unit_price: 499.0, tax_rate: 0.18 },
				{ product_id: 'prod_bolt_004', quantity: 1, unit_price: 2499.0, tax_rate: 0.18 }
			],
			totals: {
				subtotal: 3497.0,
				discount: 100.0,
				tax: 611.46,
				total: 4008.46,
				currency: 'INR',
				tax_breakdown: [
					{ rate: 0.18, subtotal: 3397.0, tax: 611.46 }
				]
			},
			payment_provider: {
				provider: 'razorpay',
				razorpay_order_id: 'order_TXqxPXnQFo5pt2'
			},
			is_anomalous: false,
			anomaly_score: 0
		},
		curl: `curl -X POST https://api.adapter.taskdrift.com/checkout_sessions/cs_e44bcc71/complete \\
  -H "X-API-Key: acp_agent_8f0a394bc..." \\
  -H "Content-Type: application/json"`
	},
	{
		id: 'price-tamper',
		title: 'Client-Side Price Tampering Neutralized',
		shortTitle: '2. Price Tampering Attack',
		badge: 'ACT 3A // DEFENSE ENGAGED',
		badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
		description: 'Malicious agent attempts to pass unit_price=₹1.00 on a ₹499.00 catalog item. Server completely discards client price and enforces authoritative catalog pricing.',
		method: 'POST',
		endpoint: '/checkout_sessions',
		requestJson: {
			line_items: [
				{ product_id: 'prod_bolt_001', quantity: 1, unit_price: 1.0 }
			],
			buyer: {
				name: 'Tamper Test Agent',
				email: 'attacker@flow.ai'
			}
		},
		responseStatus: 201,
		responseJson: {
			id: 'cs_9fe035df86e34b35',
			status: 'created',
			line_items: [
				{
					product_id: 'prod_bolt_001',
					quantity: 1,
					unit_price: 499.0,
					tax_rate: 0.18
				}
			],
			totals: {
				subtotal: 499.0,
				discount: 0.0,
				tax: 89.82,
				total: 588.82,
				currency: 'INR'
			},
			notice: 'Client unit_price ignored. Server-authoritative catalog pricing enforced.'
		},
		curl: `curl -X POST https://api.adapter.taskdrift.com/checkout_sessions \\
  -H "X-API-Key: acp_agent_8f0a394bc..." \\
  -H "Content-Type: application/json" \\
  -d '{"line_items":[{"product_id":"prod_bolt_001","quantity":1,"unit_price":1.0}]}'`
	},
	{
		id: 'guardrail-breach',
		title: 'Discount Ceiling Violation Stopped',
		shortTitle: '3. Guardrail Ceiling Breach',
		badge: 'ACT 3B // HARD REJECTION',
		badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
		description: 'Agent attempts to apply a ₹375.00 discount on a ₹499 order (75.2% discount > 50% merchant ceiling). Deterministic rule engine triggers HTTP 400 rejection and locks status into "rejected".',
		method: 'POST',
		endpoint: '/checkout_sessions/cs_9fe035df/update',
		requestJson: {
			discount: 375.0,
			line_items: [
				{ product_id: 'prod_bolt_001', quantity: 1 }
			]
		},
		responseStatus: 400,
		responseJson: {
			error: 'guardrail_violation',
			reason: 'Requested discount (75.2%) exceeds maximum allowed bound of 50% (subtotal: ₹499.00, discount: ₹375.00).',
			session_id: 'cs_9fe035df86e34b35',
			status: 'rejected'
		},
		curl: `curl -X POST https://api.adapter.taskdrift.com/checkout_sessions/cs_9fe035df \\
  -H "X-API-Key: acp_agent_8f0a394bc..." \\
  -H "Content-Type: application/json" \\
  -d '{"discount":375.0}'`
	},
	{
		id: 'inventory-expiry',
		title: 'Soft-Hold Inventory & 30-Min TTL Sweep',
		shortTitle: '4. TTL Sweeper & Release',
		badge: 'T17.1 // BACKGROUND MAINTENANCE',
		badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
		description: 'Uncompleted sessions automatically expire after 30 minutes. The background maintenance sweeper cancels expired sessions, releases soft-held inventory, and logs audit events.',
		method: 'POST',
		endpoint: '/internal/sweep_expired',
		requestJson: {
			trigger: 'cron_maintenance_job'
		},
		responseStatus: 200,
		responseJson: {
			swept_count: 2,
			expired_session_ids: ['cs_old_91823a7', 'cs_old_44183d2'],
			inventory_released: true,
			timestamp: '2026-09-04T06:30:00.000Z'
		},
		curl: `curl -X POST https://api.adapter.taskdrift.com/internal/sweep_expired`
	}
];

export default function ProtocolPlayground() {
	const [activeScenarioId, setActiveScenarioId] = useState('happy-path');
	const [activeView, setActiveView] = useState<'response' | 'request' | 'curl'>('response');
	const [copied, setCopied] = useState(false);

	const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="w-full rounded-2xl bg-white border border-slate-200/90 shadow-razorpay overflow-hidden">
			{/* Top Bar with Scenarios */}
			<div className="p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-[#0c66e4] text-white flex items-center justify-center font-bold text-xs shadow-sm">
						ACP
					</div>
					<div>
						<h3 className="text-sm font-bold text-[#0b192c]">Live Protocol Interactive Sandbox</h3>
						<p className="text-xs text-slate-500">Simulate real autonomous buyer interactions against the Razorpay rail</p>
					</div>
				</div>

				{/* Scenario Selector Pills */}
				<div className="flex flex-wrap gap-2">
					{SCENARIOS.map((s) => (
						<button
							key={s.id}
							onClick={() => setActiveScenarioId(s.id)}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
								activeScenarioId === s.id
									? 'bg-[#0c66e4] text-white shadow-md shadow-blue-500/20'
									: 'bg-white text-slate-600 hover:text-black border border-slate-200 hover:border-slate-300'
							}`}
						>
							{s.shortTitle}
						</button>
					))}
				</div>
			</div>

			{/* Scenario Details Bar */}
			<div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
				<div className="space-y-1.5 max-w-2xl">
					<div className="flex items-center gap-2.5">
						<span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${scenario.badgeColor}`}>
							{scenario.badge}
						</span>
						<span className="font-mono text-xs font-bold text-[#0b192c] bg-slate-100 px-2.5 py-0.5 rounded">
							{scenario.method} {scenario.endpoint}
						</span>
					</div>
					<h4 className="text-base font-bold text-[#0b192c]">{scenario.title}</h4>
					<p className="text-xs text-slate-500 leading-relaxed">{scenario.description}</p>
				</div>

				{/* Output View Tabs */}
				<div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-center">
					<button
						onClick={() => setActiveView('response')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'response' ? 'bg-white text-[#0c66e4] shadow-sm font-bold' : 'text-slate-600 hover:text-black'
						}`}
					>
						Live Response
					</button>
					<button
						onClick={() => setActiveView('request')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'request' ? 'bg-white text-[#0c66e4] shadow-sm font-bold' : 'text-slate-600 hover:text-black'
						}`}
					>
						Request Payload
					</button>
					<button
						onClick={() => setActiveView('curl')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'curl' ? 'bg-white text-[#0c66e4] shadow-sm font-bold' : 'text-slate-600 hover:text-black'
						}`}
					>
						cURL Command
					</button>
				</div>
			</div>

			{/* Developer Code Window (High-Contrast Navy Developer Surface) */}
			<div className="p-6 bg-[#0a1224] text-slate-200 font-mono text-xs relative">
				{/* Copy Button */}
				<button
					onClick={() =>
						handleCopy(
							activeView === 'curl'
								? scenario.curl
								: JSON.stringify(activeView === 'response' ? scenario.responseJson : scenario.requestJson, null, 2)
						)
					}
					className="absolute top-6 right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors shadow-sm"
					title="Copy content"
				>
					{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>

				{/* Window Header Indicator */}
				<div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800 text-[11px] text-slate-400">
					<div className="flex items-center gap-1.5">
						<span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
						<span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
						<span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
					</div>
					<span className="ml-2 font-mono text-slate-400">
						{activeView === 'response' ? 'HTTP_RESPONSE_VIEWER' : activeView === 'request' ? 'AGENT_PAYLOAD_VIEWER' : 'BASH_CURL_SNIPPET'}
					</span>
					{activeView === 'response' && (
						<span
							className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
								scenario.responseStatus === 200 || scenario.responseStatus === 201
									? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
									: 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
							}`}
						>
							STATUS {scenario.responseStatus} {scenario.responseStatus === 200 ? 'OK' : scenario.responseStatus === 201 ? 'CREATED' : 'BAD REQUEST'}
						</span>
					)}
				</div>

				{/* Code Output */}
				<div className="overflow-x-auto max-h-[380px]">
					{activeView === 'response' && (
						<pre className="text-emerald-300 leading-relaxed">
							<code>{JSON.stringify(scenario.responseJson, null, 2)}</code>
						</pre>
					)}
					{activeView === 'request' && (
						<pre className="text-cyan-300 leading-relaxed">
							<code>{JSON.stringify(scenario.requestJson, null, 2)}</code>
						</pre>
					)}
					{activeView === 'curl' && (
						<pre className="text-blue-300 leading-relaxed whitespace-pre-wrap">
							<code>{scenario.curl}</code>
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}
