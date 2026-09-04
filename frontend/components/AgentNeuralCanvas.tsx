'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AgentNeuralCanvas() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Respect user prefers-reduced-motion
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const scene = new THREE.Scene();

		const width = container.clientWidth || window.innerWidth;
		const height = container.clientHeight || 520;

		const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		camera.position.set(0, 0, 18);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance'
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		container.appendChild(renderer.domElement);

		// Group to hold all objects for interactive mouse tilting
		const systemGroup = new THREE.Group();
		scene.add(systemGroup);

		// Disposables registry for complete cleanup on unmount
		const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];

		// 1. Central Core Node (Razorpay Financial Rail)
		// Outer faceted crystal icosahedron
		const coreGeom = new THREE.IcosahedronGeometry(1.6, 1);
		const coreMat = new THREE.MeshBasicMaterial({
			color: 0x0c66e4, // Razorpay vibrant blue
			wireframe: true,
			transparent: true,
			opacity: 0.9,
		});
		disposables.push(coreGeom, coreMat);
		const coreMesh = new THREE.Mesh(coreGeom, coreMat);
		systemGroup.add(coreMesh);

		// Inner glow sphere (Razorpay Emerald/Cyan trust core)
		const innerCoreGeom = new THREE.SphereGeometry(1.15, 20, 20);
		const innerCoreMat = new THREE.MeshBasicMaterial({
			color: 0x00c48c,
			wireframe: true,
			transparent: true,
			opacity: 0.5,
		});
		disposables.push(innerCoreGeom, innerCoreMat);
		const innerCoreMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
		systemGroup.add(innerCoreMesh);

		// Orbiting Concentric Energy Rings
		const ringGeom = new THREE.RingGeometry(2.35, 2.42, 64);
		const ringMat = new THREE.MeshBasicMaterial({
			color: 0x0284c7, // Sky Blue
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.45,
		});
		disposables.push(ringGeom, ringMat);
		const ringMesh1 = new THREE.Mesh(ringGeom, ringMat);
		ringMesh1.rotation.x = Math.PI / 3;
		systemGroup.add(ringMesh1);

		const ringMesh2 = ringMesh1.clone();
		ringMesh2.rotation.x = -Math.PI / 3;
		ringMesh2.rotation.y = Math.PI / 4;
		systemGroup.add(ringMesh2);

		// 2. Autonomous Buyer Agent Nodes (Orbiting Nodes)
		const agentNodeData = [
			{ name: 'Aura Agent (Autonomous Buyer)', pos: new THREE.Vector3(5.6, 2.0, 1.2), color: 0x059669 }, // Emerald
			{ name: 'Bolt Agent (Fast Inference)', pos: new THREE.Vector3(-5.2, -1.8, 1.8), color: 0x0c66e4 },   // Razorpay Blue
			{ name: 'Tamper Tester (Attack Sim)', pos: new THREE.Vector3(3.8, -4.2, -1.5), color: 0xe11d48 },   // Crimson
			{ name: 'Audit Reconciler (Webhook Rail)', pos: new THREE.Vector3(-4.6, 3.8, -1.2), color: 0x7c3aed }, // Violet
			{ name: 'Catalog Searcher (Vector Agent)', pos: new THREE.Vector3(0.5, 5.2, 2.0), color: 0xd97706 },  // Amber
		];

		const packetParticles: {
			mesh: THREE.Mesh;
			start: THREE.Vector3;
			end: THREE.Vector3;
			progress: number;
			speed: number;
		}[] = [];

		agentNodeData.forEach((data) => {
			// Agent Sphere Node
			const nodeGeom = new THREE.SphereGeometry(0.46, 16, 16);
			const nodeMat = new THREE.MeshBasicMaterial({
				color: data.color,
				wireframe: true,
				transparent: true,
				opacity: 0.95,
			});
			disposables.push(nodeGeom, nodeMat);
			const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
			nodeMesh.position.copy(data.pos);
			systemGroup.add(nodeMesh);

			// Connection Rail Line from Agent to Central Core
			const linePoints = [data.pos, new THREE.Vector3(0, 0, 0)];
			const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
			const lineMat = new THREE.LineBasicMaterial({
				color: 0x93c5fd, // Crisp light blue rail
				transparent: true,
				opacity: 0.65,
			});
			disposables.push(lineGeom, lineMat);
			const line = new THREE.Line(lineGeom, lineMat);
			systemGroup.add(line);

			// Streaming Packet Particle along the rail
			const packetGeom = new THREE.SphereGeometry(0.16, 10, 10);
			const packetMat = new THREE.MeshBasicMaterial({
				color: 0x0284c7, // Vibrant electric cyan/blue packet
			});
			disposables.push(packetGeom, packetMat);
			const packetMesh = new THREE.Mesh(packetGeom, packetMat);
			packetMesh.position.copy(data.pos);
			systemGroup.add(packetMesh);

			packetParticles.push({
				mesh: packetMesh,
				start: data.pos.clone(),
				end: new THREE.Vector3(0, 0, 0),
				progress: Math.random(),
				speed: 0.007 + Math.random() * 0.006,
			});
		});

		// 3. Ambient Particle Mesh for depth
		const particleCount = 180;
		const particlePositions = new Float32Array(particleCount * 3);
		for (let i = 0; i < particleCount * 3; i += 3) {
			particlePositions[i] = (Math.random() - 0.5) * 32;
			particlePositions[i + 1] = (Math.random() - 0.5) * 24;
			particlePositions[i + 2] = (Math.random() - 0.5) * 18;
		}
		const particlesGeom = new THREE.BufferGeometry();
		particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
		const particlesMat = new THREE.PointsMaterial({
			color: 0x94a3b8, // Light slate
			size: 0.09,
			transparent: true,
			opacity: 0.6,
		});
		disposables.push(particlesGeom, particlesMat);
		const particlePoints = new THREE.Points(particlesGeom, particlesMat);
		scene.add(particlePoints);

		// Mouse Interaction
		let mouseX = 0;
		let mouseY = 0;
		let targetRotationX = 0;
		let targetRotationY = 0;

		const handleMouseMove = (event: MouseEvent) => {
			const rect = container.getBoundingClientRect();
			const x = (event.clientX - rect.left) / rect.width - 0.5;
			const y = (event.clientY - rect.top) / rect.height - 0.5;
			mouseX = x * 2;
			mouseY = y * 2;
		};

		window.addEventListener('mousemove', handleMouseMove);

		// Resize Handling
		const handleResize = () => {
			if (!container) return;
			const w = container.clientWidth;
			const h = container.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		};

		window.addEventListener('resize', handleResize);

		// Animation Loop
		let animationFrameId: number;
		let clock = new THREE.Clock();

		const renderLoop = () => {
			const elapsedTime = clock.getElapsedTime();

			if (!prefersReducedMotion) {
				// Smooth camera / group rotation with mouse parallax
				targetRotationY = mouseX * 0.45;
				targetRotationX = mouseY * 0.35;

				systemGroup.rotation.y += 0.003;
				systemGroup.rotation.x += (targetRotationX - systemGroup.rotation.x) * 0.05;
				systemGroup.rotation.z += (targetRotationY - systemGroup.rotation.z) * 0.05;

				// Core rotation
				coreMesh.rotation.y = elapsedTime * 0.4;
				coreMesh.rotation.x = elapsedTime * 0.25;
				innerCoreMesh.rotation.y = -elapsedTime * 0.3;

				ringMesh1.rotation.z = elapsedTime * 0.18;
				ringMesh2.rotation.z = -elapsedTime * 0.22;

				// Move transaction packets along rails
				packetParticles.forEach((packet) => {
					packet.progress += packet.speed;
					if (packet.progress > 1) {
						packet.progress = 0;
					}
					packet.mesh.position.lerpVectors(packet.start, packet.end, packet.progress);
				});

				particlePoints.rotation.y = elapsedTime * 0.012;
			}

			renderer.render(scene, camera);
			animationFrameId = requestAnimationFrame(renderLoop);
		};

		renderLoop();

		// Cleanup on unmount
		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('resize', handleResize);

			disposables.forEach((item) => {
				item.dispose();
			});

			renderer.dispose();
			if (container && renderer.domElement && container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		};
	}, []);

	return (
		<div className="relative w-full h-[400px] md:h-[480px] lg:h-[520px] flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-blue-50/40 via-white to-slate-50/60 border border-slate-200/80 shadow-razorpay">
			{/* Three.js canvas container */}
			<div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

			{/* Soft radial focus overlay */}
			<div
				className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(255,255,255,0.85)_95%)]"
				aria-hidden="true"
			/>

			{/* Corner Technical Bracket Accents */}
			<div className="absolute top-5 left-6 font-mono text-[11px] text-slate-500 flex items-center gap-2 pointer-events-none border-l-2 border-t-2 border-slate-300 pl-2.5 pt-1 bg-white/60 backdrop-blur-sm rounded-tl">
				<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span className="font-semibold text-slate-700">ACP_NEURAL_TOPOLOGY</span>
				<span className="text-slate-400">// LIVE_RAIL</span>
			</div>
			<div className="absolute bottom-5 right-6 font-mono text-[10px] text-slate-400 pointer-events-none border-r-2 border-b-2 border-slate-300 pr-2.5 pb-1 text-right bg-white/60 backdrop-blur-sm rounded-br">
				INTERACTIVE 3D (CURSOR PARALLAX ACTIVE)
			</div>
		</div>
	);
}
