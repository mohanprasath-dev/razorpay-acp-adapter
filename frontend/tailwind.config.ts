import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				background: '#090a0f',
				foreground: '#f8fafc',
				primary: {
					DEFAULT: '#3b82f6',
					foreground: '#ffffff',
				},
				card: {
					DEFAULT: '#11131f',
					foreground: '#f8fafc',
					border: '#1e2238',
				},
				accent: {
					DEFAULT: '#00dc82',
					foreground: '#090a0f',
				},
				muted: {
					DEFAULT: '#1e293b',
					foreground: '#94a3b8',
				},
				danger: {
					DEFAULT: '#ef4444',
					foreground: '#ffffff',
				}
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
		},
	},
	plugins: [],
};

export default config;
