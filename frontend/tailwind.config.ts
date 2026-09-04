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
				razorpay: {
					blue: '#0c66e4',
					blueHover: '#0052cc',
					navy: '#0b192c',
					dark: '#02042b',
					cyan: '#00baf2',
					emerald: '#059669',
					mint: '#10b981',
					slate: '#f8fafc',
				},
				background: '#ffffff',
				foreground: '#0b192c',
				card: {
					DEFAULT: '#ffffff',
					foreground: '#0b192c',
					border: '#e2e8f0',
				},
				muted: {
					DEFAULT: '#f1f5f9',
					foreground: '#64748b',
				},
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
				mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
			},
			boxShadow: {
				'razorpay': '0 10px 30px -5px rgba(12, 102, 228, 0.08), 0 4px 6px -2px rgba(12, 102, 228, 0.04)',
				'razorpay-hover': '0 20px 35px -5px rgba(12, 102, 228, 0.15), 0 8px 10px -3px rgba(12, 102, 228, 0.08)',
			}
		},
	},
	plugins: [],
};

export default config;
