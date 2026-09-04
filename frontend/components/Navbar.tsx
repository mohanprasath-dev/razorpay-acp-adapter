'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, ArrowUpRight, Menu, X, Activity } from 'lucide-react';

export default function Navbar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#FAF9F6]/90 border-b border-[#E8E5DF] transition-all">
			<div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
				{/* Logo / Brand */}
				<Link href="/" className="flex items-center space-x-3.5 group">
					<div className="w-9 h-9 rounded-xl bg-[#0F5E56] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
						<Layers className="w-5 h-5 text-white" />
					</div>
					<div className="flex flex-col">
						<div className="flex items-center gap-2">
							<span className="font-serif font-bold text-lg tracking-tight text-[#141210]">
								AgentPay Bridge
							</span>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] border border-[#C5D8D4] font-semibold">
								v2026-04-17
							</span>
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[#5C5852]">
							<span>Autonomous ACP Adapter</span>
							<span className="text-[#C5D8D4] font-mono">/</span>
							<span className="font-mono text-[10px] text-[#0F5E56] font-medium">Payment rail: Razorpay</span>
						</div>
					</div>
				</Link>

				{/* Desktop Nav Links */}
				<div className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-[#5C5852]">
					<a href="#problem-solution" className="hover:text-[#0F5E56] transition-colors">
						Why an Adapter
					</a>
					<a href="#pillars" className="hover:text-[#0F5E56] transition-colors">
						Safety Pillars
					</a>
					<a href="#playground" className="hover:text-[#0F5E56] transition-colors">
						Protocol Sandbox
					</a>
					<a href="#lifecycle" className="hover:text-[#0F5E56] transition-colors">
						FSM Lifecycle
					</a>
					<a href="#quickstart" className="hover:text-[#0F5E56] transition-colors">
						Quickstart
					</a>
				</div>

				{/* Right CTAs */}
				<div className="hidden md:flex items-center space-x-3">
					<Link
						href="/dashboard"
						className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0F5E56] hover:bg-[#09433D] transition-all shadow-sm active:scale-[0.98]"
					>
						<Activity className="w-3.5 h-3.5 text-[#E6F0EE]" />
						<span>Launch Live Dashboard</span>
						<ArrowUpRight className="w-3.5 h-3.5 text-[#E6F0EE]" />
					</Link>
				</div>

				{/* Mobile Menu Toggle Button */}
				<button
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					className="md:hidden p-2 rounded-lg bg-[#F4F1EC] border border-[#E8E5DF] text-[#141210] hover:text-[#0F5E56]"
					aria-label="Toggle navigation menu"
				>
					{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</div>

			{/* Mobile Dropdown */}
			{mobileMenuOpen && (
				<div className="md:hidden px-6 pt-4 pb-6 bg-[#FAF9F6] border-b border-[#E8E5DF] space-y-3 shadow-lg">
					<a
						href="#problem-solution"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-xs font-semibold uppercase tracking-wider text-[#141210] hover:text-[#0F5E56] py-1.5"
					>
						Why an Adapter
					</a>
					<a
						href="#pillars"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-xs font-semibold uppercase tracking-wider text-[#141210] hover:text-[#0F5E56] py-1.5"
					>
						Safety Pillars
					</a>
					<a
						href="#playground"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-xs font-semibold uppercase tracking-wider text-[#141210] hover:text-[#0F5E56] py-1.5"
					>
						Protocol Sandbox
					</a>
					<a
						href="#lifecycle"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-xs font-semibold uppercase tracking-wider text-[#141210] hover:text-[#0F5E56] py-1.5"
					>
						FSM Lifecycle
					</a>
					<a
						href="#quickstart"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-xs font-semibold uppercase tracking-wider text-[#141210] hover:text-[#0F5E56] py-1.5"
					>
						Quickstart
					</a>
					<div className="pt-2">
						<Link
							href="/dashboard"
							onClick={() => setMobileMenuOpen(false)}
							className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0F5E56] hover:bg-[#09433D]"
						>
							<Activity className="w-4 h-4" />
							<span>Launch Live Dashboard</span>
						</Link>
					</div>
				</div>
			)}
		</nav>
	);
}

