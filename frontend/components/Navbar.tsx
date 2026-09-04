'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, ArrowUpRight, Menu, X, Shield, Activity, ChevronRight } from 'lucide-react';

export default function Navbar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/90 border-b border-slate-200/80 shadow-sm transition-all">
			<div className="max-w-7xl mx-auto px-6 h-18 py-3 flex items-center justify-between">
				{/* Logo / Brand */}
				<Link href="/" className="flex items-center space-x-3 group">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0c66e4] to-[#00baf2] p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
						<div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
							<Layers className="w-5 h-5 text-[#0c66e4] group-hover:text-[#0052cc] transition-colors" />
						</div>
					</div>
					<div className="flex flex-col">
						<div className="flex items-center gap-2">
							<span className="font-extrabold text-base tracking-tight text-[#0b192c]">Razorpay ACP</span>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0c66e4] border border-blue-200 font-semibold">
								v2026-04-17
							</span>
						</div>
						<span className="text-[11px] text-slate-500 font-medium">Autonomous Commerce Rail</span>
					</div>
				</Link>

				{/* Desktop Nav Links */}
				<div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
					<a href="#problem-solution" className="hover:text-[#0c66e4] transition-colors">
						Why an Adapter
					</a>
					<a href="#pillars" className="hover:text-[#0c66e4] transition-colors">
						Safety Pillars
					</a>
					<a href="#playground" className="hover:text-[#0c66e4] transition-colors">
						Live Sandbox
					</a>
					<a href="#lifecycle" className="hover:text-[#0c66e4] transition-colors">
						FSM Architecture
					</a>
					<a href="#quickstart" className="hover:text-[#0c66e4] transition-colors">
						Quickstart
					</a>
				</div>

				{/* Right CTAs */}
				<div className="hidden md:flex items-center space-x-3">
					<Link
						href="/dashboard"
						className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0c66e4] hover:bg-[#0052cc] shadow-md shadow-blue-500/20 border border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
					>
						<Activity className="w-3.5 h-3.5 text-blue-100" />
						<span>Launch Live Dashboard</span>
						<ArrowUpRight className="w-3.5 h-3.5 text-blue-100" />
					</Link>
				</div>

				{/* Mobile Menu Toggle Button */}
				<button
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					className="md:hidden p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-black"
					aria-label="Toggle navigation menu"
				>
					{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</div>

			{/* Mobile Dropdown */}
			{mobileMenuOpen && (
				<div className="md:hidden px-6 pt-4 pb-6 bg-white border-b border-slate-200 space-y-3 shadow-lg">
					<a
						href="#problem-solution"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-sm font-semibold text-slate-700 hover:text-[#0c66e4] py-1.5"
					>
						Why an Adapter
					</a>
					<a
						href="#pillars"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-sm font-semibold text-slate-700 hover:text-[#0c66e4] py-1.5"
					>
						Safety Pillars
					</a>
					<a
						href="#playground"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-sm font-semibold text-slate-700 hover:text-[#0c66e4] py-1.5"
					>
						Live Sandbox
					</a>
					<a
						href="#lifecycle"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-sm font-semibold text-slate-700 hover:text-[#0c66e4] py-1.5"
					>
						FSM Architecture
					</a>
					<a
						href="#quickstart"
						onClick={() => setMobileMenuOpen(false)}
						className="block text-sm font-semibold text-slate-700 hover:text-[#0c66e4] py-1.5"
					>
						Quickstart
					</a>
					<div className="pt-2">
						<Link
							href="/dashboard"
							onClick={() => setMobileMenuOpen(false)}
							className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-[#0c66e4] hover:bg-[#0052cc]"
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
