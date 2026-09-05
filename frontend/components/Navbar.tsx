'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, ArrowUpRight, Menu, X, Activity, Zap } from 'lucide-react';
import TryDemoModal from './TryDemoModal';

export default function Navbar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [demoModalOpen, setDemoModalOpen] = useState(false);

	return (
		<>
			<nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#FAF9F6]/90 border-b border-[#E8E5DF] transition-all">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
					{/* Logo / Brand */}
					<Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0F5E56] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
							<Layers className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
						</div>
						<div className="flex flex-col">
							<div className="flex items-center gap-2">
								<span className="font-serif font-bold text-base sm:text-lg tracking-tight text-[#141210]">
									AgentPay Bridge
								</span>
								<span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-semibold">
									v2026-04-17
								</span>
							</div>
							<div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#5C5852]">
								<span>Autonomous ACP</span>
								<span className="text-[#C5D8D4] font-mono">·</span>
								<span className="font-mono text-[10px] text-[#0F5E56] font-medium">Razorpay Rail</span>
							</div>
						</div>
					</Link>

					{/* Desktop Nav Links (Linear-Style Pill Navigation) */}
					<div className="hidden lg:flex items-center gap-1 xl:gap-1.5 p-1 rounded-full bg-[#F4F1EC]/70 border border-[#E8E5DF]/90 text-[13px] font-medium text-[#5C5852]">
						<a
							href="#problem-solution"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							Why Adapter
						</a>
						<a
							href="#pillars"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							Pillars
						</a>
						<a
							href="#playground"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							Sandbox
						</a>
						<a
							href="#lifecycle"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							FSM Lifecycle
						</a>
						<a
							href="#architecture"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							Architecture
						</a>
						<a
							href="#quickstart"
							className="px-3 py-1 rounded-full hover:text-[#141210] hover:bg-white transition-all"
						>
							Quickstart
						</a>
					</div>

					{/* Right CTAs */}
					<div className="hidden sm:flex items-center space-x-2.5 flex-shrink-0">
						<button
							onClick={() => setDemoModalOpen(true)}
							className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#0F5E56] bg-[#E6F0EE] hover:bg-[#D4E8E4] border border-[#C5D8D4] transition-all shadow-sm active:scale-[0.98] whitespace-nowrap"
						>
							<Zap className="w-3.5 h-3.5 text-[#0F5E56]" />
							<span>Try Demo</span>
						</button>

						<Link
							href="/dashboard"
							className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#0F5E56] hover:bg-[#09433D] transition-all shadow-sm active:scale-[0.98] whitespace-nowrap"
						>
							<span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
							<span>Live Dashboard</span>
							<ArrowUpRight className="w-3.5 h-3.5 text-[#E6F0EE]" />
						</Link>
					</div>

					{/* Mobile Menu Toggle Button */}
					<button
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						className="lg:hidden p-2 rounded-lg bg-[#F4F1EC] border border-[#E8E5DF] text-[#141210] hover:text-[#0F5E56]"
						aria-label="Toggle navigation menu"
					>
						{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
					</button>
				</div>

				{/* Mobile Dropdown */}
				{mobileMenuOpen && (
					<div className="lg:hidden px-6 pt-4 pb-6 bg-[#FAF9F6] border-b border-[#E8E5DF] space-y-2.5 shadow-lg">
						<a
							href="#problem-solution"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							Why an Adapter
						</a>
						<a
							href="#pillars"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							Safety Pillars
						</a>
						<a
							href="#playground"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							Protocol Sandbox
						</a>
						<a
							href="#lifecycle"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							FSM Lifecycle
						</a>
						<a
							href="#architecture"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							Architecture &amp; Diagrams
						</a>
						<a
							href="#quickstart"
							onClick={() => setMobileMenuOpen(false)}
							className="block text-xs font-semibold text-[#141210] hover:text-[#0F5E56] py-1.5"
						>
							Developer Quickstart
						</a>
						<div className="pt-3 border-t border-[#E8E5DF] space-y-2">
							<button
								onClick={() => {
									setMobileMenuOpen(false);
									setDemoModalOpen(true);
								}}
								className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-[#0F5E56] bg-[#E6F0EE] border border-[#C5D8D4]"
							>
								<Zap className="w-3.5 h-3.5 text-[#0F5E56]" />
								<span>⚡ Try Interactive Demo</span>
							</button>

							<Link
								href="/dashboard"
								onClick={() => setMobileMenuOpen(false)}
								className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0F5E56] hover:bg-[#09433D]"
							>
								<span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
								<span>Launch Live Dashboard</span>
								<ArrowUpRight className="w-3.5 h-3.5 text-[#E6F0EE]" />
							</Link>
						</div>
					</div>
				)}
			</nav>

			{/* Interactive Try Demo Modal */}
			<TryDemoModal
				isOpen={demoModalOpen}
				onClose={() => setDemoModalOpen(false)}
			/>
		</>
	);
}

