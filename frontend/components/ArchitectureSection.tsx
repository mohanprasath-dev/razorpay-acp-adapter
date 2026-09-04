'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Maximize2, Download, Check, Layers, GitMerge } from 'lucide-react';

interface DiagramItem {
	id: string;
	title: string;
	tabLabel: string;
	badge: string;
	icon: React.ComponentType<{ className?: string }>;
	src: string;
	description: string;
	highlights: string[];
}

const DIAGRAMS: DiagramItem[] = [
	{
		id: 'system',
		title: 'System Topology & Component Interactions',
		tabLabel: 'System Architecture',
		badge: 'THREE-ZONE RUNTIME',
		icon: Layers,
		src: '/architecture-system.png',
		description:
			'End-to-end data flow bridging autonomous AI buyer agents through the AgentPay Bridge internal engine matrix into Razorpay settlement rails and Google Cloud Firestore.',
		highlights: [
			'Discovery & Catalog: GET /.well-known/agent.json and GET /products',
			'Authoritative pricing invariant to client prompt injection',
			'Deterministic guardrails: 50% discount ceiling, Rs 50k order cap, 10 units/SKU',
			'30-minute stock soft-hold mutex with automated TTL sweeper',
			'Cryptographic Razorpay webhook verification and append-only audit stream',
		],
	},
	{
		id: 'fsm',
		title: 'Deterministic Checkout Session FSM',
		tabLabel: 'Session FSM',
		badge: 'SEVEN-STATE DETERMINISTIC',
		icon: GitMerge,
		src: '/architecture-fsm.png',
		description:
			'Strict state transition machine governing order lifecycle. Every mutation is validated against guardrails and cryptographic state boundaries.',
		highlights: [
			'Linear happy path: CREATED -> UPDATED -> READY_FOR_PAYMENT -> COMPLETED',
			'Iterative cart patching (Mutate) and address tweaking (Tweak) self-loops',
			'Instant exception branching to REJECTED on security bounds breach',
			'Automated 30-min TTL sweep to CANCELLED (stock released back to catalog)',
			'Post-completion reversal branch strictly to REFUNDED via Razorpay Refund API',
		],
	},
];

export default function ArchitectureSection() {
	const [activeTab, setActiveTab] = useState<string>('system');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [hasDownloaded, setHasDownloaded] = useState(false);

	const currentDiagram = DIAGRAMS.find((d) => d.id === activeTab) || DIAGRAMS[0];

	const handleDownload = () => {
		const link = document.createElement('a');
		link.href = currentDiagram.src;
		link.download = `${currentDiagram.id}-architecture.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setHasDownloaded(true);
		setTimeout(() => setHasDownloaded(false), 2000);
	};

	return (
		<section id="architecture" className="py-24 max-w-7xl mx-auto px-6 space-y-10 scroll-mt-24 md:scroll-mt-28">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="space-y-3 max-w-2xl">
					<div className="font-mono text-xs uppercase tracking-wider text-[#0F5E56] font-semibold flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-[#0F5E56] inline-block" />
						Architecture &amp; Protocol Design
					</div>
					<h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141210] tracking-tight">
						Engineered for Absolute Determinism
					</h2>
					<p className="text-sm text-[#5C5852] leading-relaxed font-normal">
						Autonomous agents require mathematically predictable boundaries. Explore the full three-zone runtime
						topology and the seven-state deterministic checkout FSM.
					</p>
				</div>

				{/* Tab Buttons */}
				<div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-white border border-[#E8E5DF] shadow-sm">
					{DIAGRAMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeTab === item.id;
						return (
							<button
								key={item.id}
								onClick={() => setActiveTab(item.id)}
								className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
									isActive
										? 'bg-[#0F5E56] text-white shadow-sm'
										: 'text-[#5C5852] hover:text-[#141210] hover:bg-[#FAF9F6]'
								}`}
							>
								<Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#5C5852]'}`} />
								<span>{item.tabLabel}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Main Diagram Viewer Card */}
			<div className="rounded-2xl bg-white border border-[#E8E5DF] overflow-hidden shadow-bridge">
				{/* Top Bar of Card */}
				<div className="p-4 sm:px-6 border-b border-[#E8E5DF] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-bold">
							{currentDiagram.badge}
						</span>
						<h3 className="font-mono text-xs font-bold text-[#141210]">{currentDiagram.title}</h3>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => setIsModalOpen(true)}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4F1EC] text-[#141210] text-xs font-mono font-medium border border-[#E8E5DF] transition-colors shadow-2xs"
							title="View Fullscreen"
						>
							<Maximize2 className="w-3.5 h-3.5 text-[#5C5852]" />
							<span className="hidden sm:inline">Expand View</span>
						</button>

						<button
							onClick={handleDownload}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F5E56] hover:bg-[#09433D] text-white text-xs font-mono font-medium transition-colors shadow-2xs"
						>
							{hasDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
							<span>{hasDownloaded ? 'Downloaded' : 'Download High-Res'}</span>
						</button>
					</div>
				</div>

				{/* Image Display Surface */}
				<div
					onClick={() => setIsModalOpen(true)}
					className="relative w-full aspect-video min-h-[320px] sm:min-h-[480px] lg:min-h-[600px] bg-[#FAF9F6] cursor-zoom-in group overflow-hidden flex items-center justify-center p-3 sm:p-6"
				>
					<div className="relative w-full h-full rounded-lg overflow-hidden border border-[#E8E5DF]/60 shadow-xs transition-transform duration-300 group-hover:scale-[1.008]">
						<Image
							src={currentDiagram.src}
							alt={currentDiagram.title}
							fill
							className="object-contain"
							priority
							unoptimized
							sizes="(max-width: 1280px) 100vw, 1280px"
						/>
					</div>

					<div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-sm text-white text-[11px] font-mono px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-sm">
						<Maximize2 className="w-3 h-3" />
						<span>Click to view 100% resolution</span>
					</div>
				</div>

				{/* Description & Technical Highlights */}
				<div className="p-6 border-t border-[#E8E5DF] bg-white grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-1 space-y-2">
						<div className="text-[10px] font-mono uppercase tracking-wider text-[#5C5852] font-semibold">
							Overview
						</div>
						<p className="text-xs text-[#5C5852] leading-relaxed font-normal">{currentDiagram.description}</p>
					</div>

					<div className="md:col-span-2 space-y-2">
						<div className="text-[10px] font-mono uppercase tracking-wider text-[#0F5E56] font-semibold">
							Architectural Guarantees
						</div>
						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#141210]">
							{currentDiagram.highlights.map((h, i) => (
								<li key={i} className="flex items-start gap-2">
									<span className="text-[#0F5E56] font-bold mt-0.5">&gt;</span>
									<span className="text-[#383531] text-[11px] leading-tight">{h}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			{/* Fullscreen Lightbox Modal */}
			{isModalOpen && (
				<div
					className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
					onClick={() => setIsModalOpen(false)}
				>
					<div className="w-full max-w-7xl flex items-center justify-between pb-3 text-white">
						<div className="flex items-center gap-2">
							<span className="font-serif font-bold text-base">{currentDiagram.title}</span>
							<span className="text-xs font-mono text-[#A8D0C9]">[{currentDiagram.tabLabel}]</span>
						</div>
						<button
							onClick={() => setIsModalOpen(false)}
							className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
						>
							Close (ESC)
						</button>
					</div>

					<div
						className="relative w-full max-w-7xl h-[80vh] bg-[#FAF9F6] rounded-xl overflow-hidden shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<Image
							src={currentDiagram.src}
							alt={currentDiagram.title}
							fill
							className="object-contain"
							unoptimized
							sizes="100vw"
						/>
					</div>
				</div>
			)}
		</section>
	);
}
