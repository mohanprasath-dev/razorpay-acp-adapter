#!/usr/bin/env python3
"""Root entrypoint for Autonomous Buyer-Agent Simulator."""
import os
import sys

# Ensure proper path resolution
sys.path.insert(0, os.path.dirname(__file__))

from backend.scripts.buyer_agent_sim import main

if __name__ == '__main__':
	main()
