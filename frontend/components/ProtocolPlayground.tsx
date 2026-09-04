'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
		badge: 'STAGE 2 // FULL COMPLETION',
		badgeColor: 'text-[#0F5E56] bg-[#E6F0EE] border-[#C5D8D4]',
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
		badge: 'STAGE 3A // DEFENSE ENGAGED',
		badgeColor: 'text-[#C4602A] bg-[#F9ECE5] border-[#E8C2AF]',
		description: 'Malicious agent attempts to pass unit_price=Rs 1.00 on a Rs 499.00 catalog item. Server completely discards client price and enforces authoritative catalog pricing.',
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
		badge: 'STAGE 3B // HARD REJECTION',
		badgeColor: 'text-[#C4602A] bg-[#F9ECE5] border-[#E8C2AF]',
		description: 'Agent attempts to apply a Rs 375.00 discount on a Rs 499 order (75.2% discount > 50% merchant ceiling). Deterministic rule engine triggers HTTP 400 rejection and locks status into "rejected".',
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
			reason: 'Requested discount (75.2%) exceeds maximum allowed bound of 50% (subtotal: Rs 499.00, discount: Rs 375.00).',
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
		title: 'Soft-Hold Inventory and 30-Min TTL Sweep',
		shortTitle: '4. TTL Sweeper and Release',
		badge: 'MAINTENANCE // BACKGROUND SWEEP',
		badgeColor: 'text-[#5C5852] bg-[#F4F1EC] border-[#E8E5DF]',
		description: 'Uncompleted sessions automatically expire after 30 minutes. The background sweeper cancels expired sessions, releases soft-held inventory, and logs immutable audit events.',
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
		<div className="w-full rounded-2xl bg-white border border-[#E8E5DF] shadow-bridge overflow-hidden">
			{/* Top Bar with Scenarios */}
			<div className="p-6 border-b border-[#E8E5DF] bg-[#FAF9F6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-[#0F5E56] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
						ACP
					</div>
					<div>
						<h3 className="text-sm font-bold text-[#141210]">Protocol Sandbox Simulator</h3>
						<p className="text-xs text-[#5C5852]">Simulate autonomous buyer transactions against the payment rail</p>
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
									? 'bg-[#0F5E56] text-white shadow-sm'
									: 'bg-white text-[#5C5852] hover:text-[#141210] border border-[#E8E5DF] hover:border-[#C5D8D4]'
							}`}
						>
							{s.shortTitle}
						</button>
					))}
				</div>
			</div>

			{/* Scenario Details Bar */}
			<div className="p-6 border-b border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
				<div className="space-y-1.5 max-w-2xl">
					<div className="flex items-center gap-2.5">
						<span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${scenario.badgeColor}`}>
							{scenario.badge}
						</span>
						<span className="font-mono text-xs font-bold text-[#141210] bg-[#F4F1EC] px-2.5 py-0.5 rounded border border-[#E8E5DF]">
							{scenario.method} {scenario.endpoint}
						</span>
					</div>
					<h4 className="text-base font-bold text-[#141210]">{scenario.title}</h4>
					<p className="text-xs text-[#5C5852] leading-relaxed">{scenario.description}</p>
				</div>

				{/* Output View Tabs */}
				<div className="flex items-center gap-1.5 bg-[#F4F1EC] p-1 rounded-xl border border-[#E8E5DF] text-xs self-start sm:self-center">
					<button
						onClick={() => setActiveView('response')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'response' ? 'bg-white text-[#0F5E56] shadow-sm font-bold' : 'text-[#5C5852] hover:text-[#141210]'
						}`}
					>
						Response
					</button>
					<button
						onClick={() => setActiveView('request')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'request' ? 'bg-white text-[#0F5E56] shadow-sm font-bold' : 'text-[#5C5852] hover:text-[#141210]'
						}`}
					>
						Payload
					</button>
					<button
						onClick={() => setActiveView('curl')}
						className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
							activeView === 'curl' ? 'bg-white text-[#0F5E56] shadow-sm font-bold' : 'text-[#5C5852] hover:text-[#141210]'
						}`}
					>
						cURL
					</button>
				</div>
			</div>

			{/* Developer Code Window */}
			<div className="p-6 bg-[#121817] text-[#E2DED7] font-mono text-xs relative">
				{/* Copy Button */}
				<button
					onClick={() =>
						handleCopy(
							activeView === 'curl'
								? scenario.curl
								: JSON.stringify(activeView === 'response' ? scenario.responseJson : scenario.requestJson, null, 2)
						)
					}
					className="absolute top-6 right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2625] hover:bg-[#283231] text-[#E2DED7] border border-[#2E3A38] text-xs transition-colors shadow-sm"
					title="Copy content"
				>
					{copied ? <Check className="w-3.5 h-3.5 text-[#188a7e]" /> : <Copy className="w-3.5 h-3.5" />}
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>

				{/* Window Header Indicator */}
				<div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#242E2D] text-[11px] text-[#8C8880]">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-full bg-[#364240]"></span>
						<span className="w-2.5 h-2.5 rounded-full bg-[#364240]"></span>
						<span className="w-2.5 h-2.5 rounded-full bg-[#364240]"></span>
					</div>
					<span className="ml-2 font-mono text-[#8C8880]">
						{activeView === 'response' ? 'HTTP_RESPONSE' : activeView === 'request' ? 'AGENT_PAYLOAD' : 'CURL_COMMAND'}
					</span>
					{activeView === 'response' && (
						<span
							className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
								scenario.responseStatus === 200 || scenario.responseStatus === 201
									? 'bg-[#0F5E56]/30 text-[#A3E0D8] border border-[#0F5E56]/50'
									: 'bg-[#C4602A]/20 text-[#E8C2AF] border border-[#C4602A]/40'
							}`}
						>
							STATUS {scenario.responseStatus} {scenario.responseStatus === 200 ? 'OK' : scenario.responseStatus === 201 ? 'CREATED' : 'BAD REQUEST'}
						</span>
					)}
				</div>

				{/* Code Output */}
				<div className="overflow-x-auto max-h-[380px]">
					{activeView === 'response' && (
						<pre className="text-[#A3E0D8] leading-relaxed">
							<code>{JSON.stringify(scenario.responseJson, null, 2)}</code>
						</pre>
					)}
					{activeView === 'request' && (
						<pre className="text-[#E2DED7] leading-relaxed">
							<code>{JSON.stringify(scenario.requestJson, null, 2)}</code>
						</pre>
					)}
					{activeView === 'curl' && (
						<pre className="text-[#E2DED7] leading-relaxed whitespace-pre-wrap">
							<code>{scenario.curl}</code>
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}

