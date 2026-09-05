'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface NodeInfo {
	id: string;
	title: string;
	role: string;
	color: number;
	pos: [number, number, number];
	status: string;
}

const NODES_METADATA: NodeInfo[] = [
	{
		id: 'buyer-agent',
		title: 'Aura Agent',
		role: 'Autonomous Buyer Intent',
		color: 0x0f5e56, // Deep Teal
		pos: [2.05, 0.85, 0.3],
		status: 'DISPATCHING',
	},
	{
		id: 'guardrail',
		title: 'Guardrail Mutex',
		role: 'Deterministic Rule Engine',
		color: 0xc4602a, // Rich Amber
		pos: [-1.95, -0.7, 0.35],
		status: 'ENFORCING',
	},
	{
		id: 'inventory',
		title: 'Stock Lock',
		role: '30-Min TTL Soft-Hold',
		color: 0x3d7068, // Mineral Teal
		pos: [1.4, -1.4, -0.5],
		status: 'RESERVED',
	},
	{
		id: 'razorpay-rail',
		title: 'Settlement Rail',
		role: 'Razorpay Orders API',
		color: 0x0f5e56, // Deep Teal
		pos: [-1.55, 1.4, -0.35],
		status: 'SYNCHRONIZED',
	},
];

export default function AgentNeuralCanvas() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [activeNode, setActiveNode] = useState<NodeInfo | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Scene Setup
		const scene = new THREE.Scene();

		const width = container.clientWidth || 500;
		const height = container.clientHeight || 440;

		// Optimal camera framing for balanced architectural scale
		const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
		camera.position.set(0, 0.2, 7.2);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		container.appendChild(renderer.domElement);

		const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

		// Studio Lighting for High-Contrast Sculptural Planes
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
		scene.add(ambientLight);

		// Key Light: Sharp top-right crisp illumination
		const keyLight = new THREE.DirectionalLight(0xfffdfa, 3.4);
		keyLight.position.set(8, 12, 10);
		scene.add(keyLight);

		// Rim / Counter Light: Warm amber specular bevels
		const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.6);
		rimLight.position.set(-10, -6, -8);
		scene.add(rimLight);

		// Soft Teal Fill Light
		const fillLight = new THREE.DirectionalLight(0x0f5e56, 1.4);
		fillLight.position.set(0, -8, 6);
		scene.add(fillLight);

		// Central Omnidirectional Point Glow
		const coreLight = new THREE.PointLight(0x0f5e56, 2.4, 6);
		coreLight.position.set(0, 0, 0);
		scene.add(coreLight);

		// Root Transformation Group for Parallax
		const masterGroup = new THREE.Group();
		scene.add(masterGroup);

		// -------------------------------------------------------------
		// 1. Central Kinetic Core: Refined Faceted Polyhedron (Compact & Sculptural)
		// -------------------------------------------------------------
		const coreGroup = new THREE.Group();
		masterGroup.add(coreGroup);

		// Outer Sculptural Shell: Proportional Dodecahedron with Crisp Flat Shading
		const outerCoreGeom = new THREE.DodecahedronGeometry(0.58, 0);
		const outerCoreMat = new THREE.MeshStandardMaterial({
			color: 0x0f5e56, // Deep Teal
			roughness: 0.18,
			metalness: 0.28,
			flatShading: true,
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 1,
		});
		disposables.push(outerCoreGeom, outerCoreMat);
		const outerCoreMesh = new THREE.Mesh(outerCoreGeom, outerCoreMat);
		coreGroup.add(outerCoreMesh);

		// Architectural Edge Lines (Using EdgesGeometry to outline true polygonal facets)
		const edgesGeom = new THREE.EdgesGeometry(outerCoreGeom);
		const edgesMat = new THREE.LineBasicMaterial({
			color: 0x141210, // Near-black crisp ink bevels
			linewidth: 1.5,
			transparent: true,
			opacity: 0.55,
		});
		disposables.push(edgesGeom, edgesMat);
		const edgeLines = new THREE.LineSegments(edgesGeom, edgesMat);
		outerCoreMesh.add(edgeLines);

		// Inner Floating Geometric Kernel (Gold/Amber Octahedron)
		const innerKernelGeom = new THREE.OctahedronGeometry(0.28, 0);
		const innerKernelMat = new THREE.MeshStandardMaterial({
			color: 0xc4602a, // Rich Amber
			roughness: 0.2,
			metalness: 0.7,
			flatShading: true,
		});
		disposables.push(innerKernelGeom, innerKernelMat);
		const innerKernelMesh = new THREE.Mesh(innerKernelGeom, innerKernelMat);
		coreGroup.add(innerKernelMesh);

		// Wireframe Halo around Kernel
		const kernelEdges = new THREE.EdgesGeometry(innerKernelGeom);
		const kernelEdgesMat = new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.7,
		});
		disposables.push(kernelEdges, kernelEdgesMat);
		const kernelEdgeLines = new THREE.LineSegments(kernelEdges, kernelEdgesMat);
		innerKernelMesh.add(kernelEdgeLines);

		// -------------------------------------------------------------
		// 2. Volumetric Mechanical Gimbal Rings (Sleek, Slender, Proportional)
		// -------------------------------------------------------------
		const ringGroup = new THREE.Group();
		masterGroup.add(ringGroup);

		// Primary Orbit Gimbal (Slender Slate Ring)
		const ring1Geom = new THREE.TorusGeometry(0.92, 0.015, 16, 100);
		const ring1Mat = new THREE.MeshStandardMaterial({
			color: 0x5c5852, // Muted slate ink
			roughness: 0.3,
			metalness: 0.5,
		});
		disposables.push(ring1Geom, ring1Mat);
		const ring1Mesh = new THREE.Mesh(ring1Geom, ring1Mat);
		ring1Mesh.rotation.x = Math.PI / 3;
		ring1Mesh.rotation.y = Math.PI / 10;
		ringGroup.add(ring1Mesh);

		// Secondary Inclined Gimbal (Amber Accent Ring)
		const ring2Geom = new THREE.TorusGeometry(1.18, 0.012, 16, 100);
		const ring2Mat = new THREE.MeshStandardMaterial({
			color: 0xc4602a, // Amber
			roughness: 0.25,
			metalness: 0.6,
		});
		disposables.push(ring2Geom, ring2Mat);
		const ring2Mesh = new THREE.Mesh(ring2Geom, ring2Mat);
		ring2Mesh.rotation.x = -Math.PI / 4;
		ring2Mesh.rotation.z = Math.PI / 6;
		ringGroup.add(ring2Mesh);

		// -------------------------------------------------------------
		// 3. Hardware Satellite Modules & Conduits
		// -------------------------------------------------------------
		const raycastTargets: { mesh: THREE.Mesh; data: NodeInfo }[] = [];
		const packetStreams: {
			mesh: THREE.Mesh;
			start: THREE.Vector3;
			end: THREE.Vector3;
			progress: number;
			speed: number;
		}[] = [];

		NODES_METADATA.forEach((node) => {
			const nodePos = new THREE.Vector3(...node.pos);

			// Node Pod Container
			const podGroup = new THREE.Group();
			podGroup.position.copy(nodePos);
			masterGroup.add(podGroup);

			// Chamfered Hardware Pod: Cylinder housing
			const podHousingGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.22, 12);
			const podHousingMat = new THREE.MeshStandardMaterial({
				color: 0xffffff,
				roughness: 0.2,
				metalness: 0.3,
			});
			disposables.push(podHousingGeom, podHousingMat);
			const podMesh = new THREE.Mesh(podHousingGeom, podHousingMat);
			podMesh.rotation.x = Math.PI / 4;
			podMesh.rotation.z = Math.PI / 6;
			podGroup.add(podMesh);

			// Indicator Jewel atop the pod
			const jewelGeom = new THREE.OctahedronGeometry(0.14, 0);
			const jewelMat = new THREE.MeshStandardMaterial({
				color: node.color,
				roughness: 0.1,
				metalness: 0.4,
				flatShading: true,
			});
			disposables.push(jewelGeom, jewelMat);
			const jewelMesh = new THREE.Mesh(jewelGeom, jewelMat);
			jewelMesh.position.set(0, 0.18, 0);
			podGroup.add(jewelMesh);

			raycastTargets.push({ mesh: podMesh, data: node });

			// Physical Conduit Rail to Settlement Core
			const railPoints = [nodePos, new THREE.Vector3(0, 0, 0)];
			const railGeom = new THREE.BufferGeometry().setFromPoints(railPoints);
			const railMat = new THREE.LineBasicMaterial({
				color: 0xc5d8d4,
				transparent: true,
				opacity: 0.8,
			});
			disposables.push(railGeom, railMat);
			const railLine = new THREE.Line(railGeom, railMat);
			masterGroup.add(railLine);

			// Volumetric Kinetic Transaction Packet
			const packetGeom = new THREE.SphereGeometry(0.075, 12, 12);
			const packetMat = new THREE.MeshStandardMaterial({
				color: node.color,
				roughness: 0.15,
				metalness: 0.3,
			});
			disposables.push(packetGeom, packetMat);
			const packetMesh = new THREE.Mesh(packetGeom, packetMat);
			masterGroup.add(packetMesh);

			packetStreams.push({
				mesh: packetMesh,
				start: nodePos.clone(),
				end: new THREE.Vector3(0, 0, 0),
				progress: Math.random(),
				speed: 0.008 + Math.random() * 0.004,
			});
		});

		// -------------------------------------------------------------
		// 4. Subtle Architectural Coordinate Markers
		// -------------------------------------------------------------
		const ticksCount = 48;
		const tickPositions = new Float32Array(ticksCount * 3);
		for (let i = 0; i < ticksCount; i++) {
			const angle = (i / ticksCount) * Math.PI * 2;
			const radius = 1.75;
			tickPositions[i * 3] = Math.cos(angle) * radius;
			tickPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
			tickPositions[i * 3 + 2] = Math.sin(angle) * radius;
		}
		const ticksGeom = new THREE.BufferGeometry();
		ticksGeom.setAttribute('position', new THREE.BufferAttribute(tickPositions, 3));
		const ticksMat = new THREE.PointsMaterial({
			color: 0x0f5e56,
			size: 0.032,
			transparent: true,
			opacity: 0.45,
		});
		disposables.push(ticksGeom, ticksMat);
		const tickPoints = new THREE.Points(ticksGeom, ticksMat);
		masterGroup.add(tickPoints);

		// -------------------------------------------------------------
		// 5. Interactive Cursor Tracking & Smooth Lerp
		// -------------------------------------------------------------
		let targetRotX = 0;
		let targetRotY = 0;
		const raycaster = new THREE.Raycaster();
		const mouseVec = new THREE.Vector2(-999, -999);

		const handleMouseMove = (event: MouseEvent) => {
			const rect = container.getBoundingClientRect();
			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			mouseVec.x = x;
			mouseVec.y = y;

			targetRotY = x * 0.45;
			targetRotX = -y * 0.35;

			// Raycast check
			raycaster.setFromCamera(mouseVec, camera);
			const intersects = raycaster.intersectObjects(raycastTargets.map((t) => t.mesh));
			if (intersects.length > 0) {
				const hit = raycastTargets.find((t) => t.mesh === intersects[0].object);
				if (hit) {
					setActiveNode(hit.data);
					return;
				}
			}
			setActiveNode(null);
		};

		const handleMouseLeave = () => {
			targetRotX = 0;
			targetRotY = 0;
			setActiveNode(null);
		};

		container.addEventListener('mousemove', handleMouseMove);
		container.addEventListener('mouseleave', handleMouseLeave);

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

		const render = () => {
			const delta = clock.getDelta();
			const elapsedTime = clock.getElapsedTime();

			if (!prefersReducedMotion) {
				// Smooth Parallax Lerp
				masterGroup.rotation.y += (targetRotY - masterGroup.rotation.y) * 0.06;
				masterGroup.rotation.x += (targetRotX - masterGroup.rotation.x) * 0.06;

				// Kinetic Rotation of Core
				outerCoreMesh.rotation.y += delta * 0.32;
				outerCoreMesh.rotation.x += delta * 0.16;

				innerKernelMesh.rotation.y -= delta * 0.55;
				innerKernelMesh.rotation.z += delta * 0.28;

				// Counter-rotating mechanical gimbals
				ring1Mesh.rotation.z += delta * 0.12;
				ring2Mesh.rotation.z -= delta * 0.16;

				// Advance transaction packets along rails
				packetStreams.forEach((packet) => {
					packet.progress += packet.speed;
					if (packet.progress > 1) {
						packet.progress = 0;
					}
					packet.mesh.position.lerpVectors(packet.start, packet.end, packet.progress);
				});

				tickPoints.rotation.y += delta * 0.05;
			}

			renderer.render(scene, camera);
			animationFrameId = requestAnimationFrame(render);
		};

		render();

		// Complete Unmount Cleanup
		return () => {
			cancelAnimationFrame(animationFrameId);
			container.removeEventListener('mousemove', handleMouseMove);
			container.removeEventListener('mouseleave', handleMouseLeave);
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
		<div className="relative w-full h-[380px] sm:h-[420px] lg:h-[440px] flex flex-col justify-between overflow-hidden rounded-2xl bg-[#FAF9F6] border border-[#E8E5DF] shadow-bridge transition-all">
			{/* Top Monospace Technical Status Bar */}
			<div className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b border-[#E8E5DF] bg-[#FAF9F6]/90 backdrop-blur-sm">
				<div className="flex items-center gap-2 font-mono text-[11px] text-[#141210] font-semibold">
					<span className="w-2 h-2 rounded-full bg-[#0F5E56] animate-pulse"></span>
					<span>BRIDGE_KERNEL: ACTIVE</span>
				</div>
				<div className="font-mono text-[10px] text-[#5C5852] uppercase tracking-wider">
					ACP // DETERMINISTIC RAILS
				</div>
			</div>

			{/* Three.js Interactive Viewport */}
			<div className="relative flex-1 w-full h-full">
				<div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

				{/* Subtle Focus Radial Gradient (blends edges softly into #FAF9F6) */}
				<div
					className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(250,249,246,0.85)_92%)]"
					aria-hidden="true"
				/>

				{/* Dynamic Node Hover Telemetry Overlay */}
				{activeNode && (
					<div className="absolute top-4 left-4 z-20 pointer-events-none p-3 rounded-lg bg-white/95 border border-[#C5D8D4] shadow-bridge max-w-xs font-mono transition-all animate-in fade-in">
						<div className="flex items-center justify-between gap-2 pb-1 border-b border-[#E8E5DF]">
							<span className="text-[11px] font-bold text-[#0F5E56]">{activeNode.title}</span>
							<span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E6F0EE] text-[#0F5E56] font-bold">
								{activeNode.status}
							</span>
						</div>
						<div className="text-[10px] text-[#5C5852] pt-1">{activeNode.role}</div>
					</div>
				)}
			</div>

			{/* Bottom Telemetry Footer */}
			<div className="relative z-10 flex items-center justify-between px-5 py-3 border-t border-[#E8E5DF] bg-[#FAF9F6]/90 backdrop-blur-sm font-mono text-[10px] text-[#5C5852]">
				<div className="flex items-center gap-2">
					<span className="text-[#0F5E56] font-bold">4 NODES CONNECTED</span>
					<span className="text-[#C5D8D4]">/</span>
					<span>MUTEX LOCKED</span>
				</div>
				<span className="text-[9px] text-[#8C8880] uppercase tracking-wider">
					PARALLAX ROTATION ENABLED
				</span>
			</div>
		</div>
	);
}
