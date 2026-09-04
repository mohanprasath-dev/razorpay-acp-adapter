import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AgentPay Bridge | ACP Checkout Adapter for AI Buyer Agents';
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					background: '#FAF9F6',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '70px 80px',
					fontFamily: 'sans-serif',
					border: '16px solid #FAF9F6',
				}}
			>
				{/* Top Bar */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
						<div
							style={{
								width: '54px',
								height: '54px',
								borderRadius: '14px',
								background: '#0F5E56',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: '#ffffff',
								fontSize: '28px',
								fontWeight: 'bold',
							}}
						>
							B
						</div>
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							<span style={{ fontSize: '28px', fontWeight: 'bold', color: '#141210', letterSpacing: '-0.5px' }}>
								AgentPay Bridge
							</span>
							<span style={{ fontSize: '15px', color: '#5C5852', fontFamily: 'monospace' }}>
								ACP v2026-04-17 | Track 01
							</span>
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							background: '#E6F0EE',
							border: '1.5px solid #C5D8D4',
							padding: '8px 18px',
							borderRadius: '999px',
							color: '#0F5E56',
							fontSize: '15px',
							fontWeight: 'bold',
							fontFamily: 'monospace',
						}}
					>
						Payment rail: Razorpay
					</div>
				</div>

				{/* Middle: Headline & Tagline */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }}>
					<h1
						style={{
							fontSize: '54px',
							lineHeight: '1.15',
							fontWeight: '800',
							color: '#141210',
							letterSpacing: '-1.5px',
							margin: 0,
						}}
					>
						The Financial Safety Rail for Autonomous AI Buyer Agents
					</h1>
					<p
						style={{
							fontSize: '22px',
							lineHeight: '1.4',
							color: '#5C5852',
							margin: 0,
						}}
					>
						Server-authoritative pricing, deterministic guardrails, 30-min inventory soft-holds, and immutable audit trails on the Razorpay rail.
					</p>
				</div>

				{/* Bottom: Technical Metric Pills */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '24px',
						paddingTop: '28px',
						borderTop: '2px solid #E8E5DF',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<span style={{ fontSize: '13px', color: '#5C5852', fontFamily: 'monospace', fontWeight: 'bold' }}>
							AUTOMATED TEST SUITE
						</span>
						<span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F5E56', fontFamily: 'monospace' }}>
							91 / 91 Passing (100%)
						</span>
					</div>

					<div style={{ width: '2px', height: '40px', background: '#E8E5DF' }} />

					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<span style={{ fontSize: '13px', color: '#5C5852', fontFamily: 'monospace', fontWeight: 'bold' }}>
							BOUNDED SAFETY LIMITS
						</span>
						<span style={{ fontSize: '24px', fontWeight: 'bold', color: '#141210', fontFamily: 'monospace' }}>
							Max 50% Disc | Rs 50k Cap
						</span>
					</div>

					<div style={{ width: '2px', height: '40px', background: '#E8E5DF' }} />

					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<span style={{ fontSize: '13px', color: '#5C5852', fontFamily: 'monospace', fontWeight: 'bold' }}>
							INVENTORY MUTEX
						</span>
						<span style={{ fontSize: '24px', fontWeight: 'bold', color: '#141210', fontFamily: 'monospace' }}>
							30-Min TTL Soft-Hold
						</span>
					</div>
				</div>
			</div>
		),
		{
			...size,
		}
	);
}
