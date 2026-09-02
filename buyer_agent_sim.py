#!/usr/bin/env python3
"""Root entrypoint for Autonomous Buyer-Agent Simulator."""
import os
import sys

# Ensure proper path resolution
sys.path.insert(0, os.path.dirname(__file__))

from backend.scripts.buyer_agent_sim import main as _main, run_simulator, argparse

if __name__ == '__main__':
	parser = argparse.ArgumentParser(description='Run Scripted Buyer-Agent Simulator for Razorpay ACP Adapter')
	parser.add_argument('--base-url', default='http://localhost:8000', help='Target ACP backend base URL')
	parser.add_argument('--pause', type=float, default=0.4, help='Pause between steps in seconds for recording clarity')
	args = parser.parse_args()

	run_simulator(base_url=args.base_url, pause_seconds=args.pause)
