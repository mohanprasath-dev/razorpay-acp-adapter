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

		const width = container.clientWidth || 800;
		const height = container.clientHeight || 500;

		const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		camera.position.set(0, 1.2, 17);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		container.appendChild(renderer.domElement);

		// Disposables registry for complete cleanup on unmount
		const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

		// Lighting for physical faceted depth
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
		scene.add(ambientLight);

		const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.8);
		dirLight1.position.set(12, 18, 14);
		scene.add(dirLight1);

		const dirLight2 = new THREE.DirectionalLight(0xe6f0ee, 1.2);
		dirLight2.position.set(-14, -8, -10);
		scene.add(dirLight2);

		const corePointLight = new THREE.PointLight(0x0f5e56, 3.5, 12);
		corePointLight.position.set(0, 0, 0);
		scene.add(corePointLight);

		// Main system group for cursor parallax
		const systemGroup = new THREE.Group();
		scene.add(systemGroup);

		// 1. Central Faceted Crystal Icosahedron (AgentPay Core)
		const coreGeom = new THREE.IcosahedronGeometry(1.7, 0); // Bold 20 facets
		const coreMat = new THREE.MeshStandardMaterial({
			color: 0x0f5e56, // Deep Teal
			roughness: 0.25,
			metalness: 0.15,
			flatShading: true,
			transparent: true,
			opacity: 0.92,
		});
		disposables.push(coreGeom, coreMat);
		const coreMesh = new THREE.Mesh(coreGeom, coreMat);
		systemGroup.add(coreMesh);

		// Bold wireframe facet overlay
		const wireframeGeom = new THREE.WireframeGeometry(coreGeom);
		const wireframeMat = new THREE.LineBasicMaterial({
			color: 0x141210,
			transparent: true,
			opacity: 0.35,
		});
		disposables.push(wireframeGeom, wireframeMat);
		const wireframeLines = new THREE.LineSegments(wireframeGeom, wireframeMat);
		coreMesh.add(wireframeLines);

		// Luminous inner core sphere
		const innerCoreGeom = new THREE.SphereGeometry(1.05, 24, 24);
		const innerCoreMat = new THREE.MeshBasicMaterial({
			color: 0x188a7e,
			wireframe: true,
			transparent: true,
			opacity: 0.6,
		});
		disposables.push(innerCoreGeom, innerCoreMat);
		const innerCoreMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
		systemGroup.add(innerCoreMesh);

		// Orbital Torus Rings
		const ringGeom1 = new THREE.TorusGeometry(3.6, 0.022, 16, 120);
		const ringMat1 = new THREE.MeshBasicMaterial({
			color: 0x0f5e56,
			transparent: true,
			opacity: 0.35,
		});
		disposables.push(ringGeom1, ringMat1);
		const ringMesh1 = new THREE.Mesh(ringGeom1, ringMat1);
		ringMesh1.rotation.x = Math.PI / 3;
		ringMesh1.rotation.y = Math.PI / 8;
		systemGroup.add(ringMesh1);

		const ringGeom2 = new THREE.TorusGeometry(4.4, 0.02, 16, 120);
		const ringMat2 = new THREE.MeshBasicMaterial({
			color: 0xc4602a, // Amber secondary orbit
			transparent: true,
			opacity: 0.28,
		});
		disposables.push(ringGeom2, ringMat2);
		const ringMesh2 = new THREE.Mesh(ringGeom2, ringMat2);
		ringMesh2.rotation.x = -Math.PI / 3.5;
		ringMesh2.rotation.y = -Math.PI / 6;
		systemGroup.add(ringMesh2);

		// 2. Orbiting Autonomous Buyer Agent Nodes
		const nodesData = [
			{ name: 'Aura Agent (Autonomous Buyer)', pos: new THREE.Vector3(5.2, 1.6, 1.0), color: 0x0f5e56 },
			{ name: 'Deterministic Guardrail Engine', pos: new THREE.Vector3(-4.9, -1.8, 1.4), color: 0xc4602a },
			{ name: 'Soft-Hold Sweeper (30m TTL)', pos: new THREE.Vector3(3.4, -3.8, -1.6), color: 0x5c5852 },
			{ name: 'Webhook Cryptographic Rail', pos: new THREE.Vector3(-4.2, 3.4, -1.2), color: 0x0f5e56 },
			{ name: 'Catalog Authority Validator', pos: new THREE.Vector3(0.6, 4.6, 1.8), color: 0xc4602a },
		];

		const packetParticles: {
			mesh: THREE.Mesh;
			start: THREE.Vector3;
			end: THREE.Vector3;
			progress: number;
			speed: number;
		}[] = [];

		nodesData.forEach((node) => {
			// Solid node sphere with specular highlight
			const nodeGeom = new THREE.SphereGeometry(0.42, 24, 24);
			const nodeMat = new THREE.MeshStandardMaterial({
				color: node.color,
				roughness: 0.2,
				metalness: 0.1,
			});
			disposables.push(nodeGeom, nodeMat);
			const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
			nodeMesh.position.copy(node.pos);
			systemGroup.add(nodeMesh);

			// Outer subtle halo ring
			const haloGeom = new THREE.RingGeometry(0.55, 0.62, 32);
			const haloMat = new THREE.MeshBasicMaterial({
				color: node.color,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.45,
			});
			disposables.push(haloGeom, haloMat);
			const haloMesh = new THREE.Mesh(haloGeom, haloMat);
			haloMesh.position.copy(node.pos);
			haloMesh.lookAt(camera.position);
			systemGroup.add(haloMesh);

			// Visible transaction rail line to core
			const railPoints = [node.pos, new THREE.Vector3(0, 0, 0)];
			const railGeom = new THREE.BufferGeometry().setFromPoints(railPoints);
			const railMat = new THREE.LineBasicMaterial({
				color: 0xc5d8d4,
				transparent: true,
				opacity: 0.7,
			});
			disposables.push(railGeom, railMat);
			const railLine = new THREE.Line(railGeom, railMat);
			systemGroup.add(railLine);

			// Animated transaction pulse packet
			const packetGeom = new THREE.SphereGeometry(0.14, 12, 12);
			const packetMat = new THREE.MeshBasicMaterial({
				color: node.color === 0xc4602a ? 0xc4602a : 0x0f5e56,
			});
			disposables.push(packetGeom, packetMat);
			const packetMesh = new THREE.Mesh(packetGeom, packetMat);
			packetMesh.position.copy(node.pos);
			systemGroup.add(packetMesh);

			packetParticles.push({
				mesh: packetMesh,
				start: node.pos.clone(),
				end: new THREE.Vector3(0, 0, 0),
				progress: Math.random(),
				speed: 0.007 + Math.random() * 0.005,
			});
		});

		// 3. Subtle Ambient Particle Dust (Warm Gray/Stone)
		const particleCount = 140;
		const particlePositions = new Float32Array(particleCount * 3);
		for (let i = 0; i < particleCount * 3; i += 3) {
			particlePositions[i] = (Math.random() - 0.5) * 28;
			particlePositions[i + 1] = (Math.random() - 0.5) * 20;
			particlePositions[i + 2] = (Math.random() - 0.5) * 16;
		}
		const particlesGeom = new THREE.BufferGeometry();
		particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
		const particlesMat = new THREE.PointsMaterial({
			color: 0xb5b0a4,
			size: 0.08,
			transparent: true,
			opacity: 0.55,
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
		const clock = new THREE.Clock();

		const renderLoop = () => {
			const elapsedTime = clock.getElapsedTime();

			if (!prefersReducedMotion) {
				// Smooth camera / group rotation with mouse parallax
				targetRotationY = mouseX * 0.35;
				targetRotationX = mouseY * 0.25;

				systemGroup.rotation.y += 0.0025;
				systemGroup.rotation.x += (targetRotationX - systemGroup.rotation.x) * 0.05;
				systemGroup.rotation.z += (targetRotationY - systemGroup.rotation.z) * 0.05;

				// Core rotation
				coreMesh.rotation.y = elapsedTime * 0.35;
				coreMesh.rotation.x = elapsedTime * 0.2;
				innerCoreMesh.rotation.y = -elapsedTime * 0.28;

				ringMesh1.rotation.z = elapsedTime * 0.15;
				ringMesh2.rotation.z = -elapsedTime * 0.18;

				// Move transaction packets along rails
				packetParticles.forEach((packet) => {
					packet.progress += packet.speed;
					if (packet.progress > 1) {
						packet.progress = 0;
					}
					packet.mesh.position.lerpVectors(packet.start, packet.end, packet.progress);
				});

				particlePoints.rotation.y = elapsedTime * 0.008;
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
		<div className="relative w-full h-[380px] md:h-[460px] lg:h-[500px] flex items-center justify-center overflow-hidden rounded-2xl bg-[#FAF9F6] border border-[#E8E5DF] shadow-bridge">
			{/* Three.js canvas container */}
			<div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

			{/* Soft radial focus overlay */}
			<div
				className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(250,249,246,0.8)_95%)]"
				aria-hidden="true"
			/>

			{/* Technical Corner Annotations */}
			<div className="absolute top-4 left-5 font-mono text-[10px] text-[#5C5852] flex items-center gap-2 pointer-events-none bg-[#FAF9F6]/85 backdrop-blur-sm border border-[#E8E5DF] px-2.5 py-1 rounded">
				<span className="w-1.5 h-1.5 rounded-full bg-[#0F5E56]"></span>
				<span className="font-semibold text-[#141210]">AGENTPAY_TOPOLOGY</span>
				<span className="text-[#8C8880]">// LIVE_ORBIT</span>
			</div>

			<div className="absolute bottom-4 right-5 font-mono text-[10px] text-[#8C8880] pointer-events-none bg-[#FAF9F6]/85 backdrop-blur-sm border border-[#E8E5DF] px-2.5 py-1 rounded">
				INTERACTIVE 3D RAIL [PARALLAX ACTIVE]
			</div>
		</div>
	);
}

