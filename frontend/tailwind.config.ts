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
				surface: '#FAF9F6',
				ink: '#141210',
				'ink-muted': '#5C5852',
				'border-subtle': '#E8E5DF',
				accent: {
					DEFAULT: '#0F5E56',
					hover: '#09433D',
					subtle: '#E6F0EE',
					border: '#C5D8D4',
				},
				background: '#FAF9F6',
				foreground: '#141210',
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#141210',
					border: '#E8E5DF',
				},
				muted: {
					DEFAULT: '#F4F1EC',
					foreground: '#5C5852',
				},
			},
			fontFamily: {
				serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
				sans: ['var(--font-geist-sans)', '-apple-system', 'sans-serif'],
				mono: ['var(--font-geist-mono)', 'SFMono-Regular', 'Consolas', 'monospace'],
			},
			boxShadow: {
				'bridge': '0 1px 3px rgba(20, 18, 16, 0.04), 0 8px 24px -4px rgba(20, 18, 16, 0.04)',
				'bridge-hover': '0 4px 6px -1px rgba(20, 18, 16, 0.06), 0 16px 32px -4px rgba(20, 18, 16, 0.08)',
			}
		},
	},
	plugins: [],
};

export default config;

