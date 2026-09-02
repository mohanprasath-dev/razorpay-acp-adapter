import { CheckoutSession, AuditEntry } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchSessions(): Promise<CheckoutSession[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			throw new Error(`Failed to fetch sessions: ${res.statusText}`);
		}
		return await res.json();
	} catch (err) {
		console.error('Error fetching sessions:', err);
		return [];
	}
}

export async function fetchSessionById(id: string): Promise<CheckoutSession | null> {
	try {
		const res = await fetch(`${API_BASE_URL}/checkout_sessions/${id}`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			return null;
		}
		return await res.json();
	} catch (err) {
		console.error(`Error fetching session ${id}:`, err);
		return null;
	}
}

export async function fetchSessionAudit(id: string): Promise<AuditEntry[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/checkout_sessions/${id}/audit`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			return [];
		}
		return await res.json();
	} catch (err) {
		console.error(`Error fetching audit trail for ${id}:`, err);
		return [];
	}
}

export async function fetchGlobalAudit(): Promise<AuditEntry[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/audit_entries`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			return [];
		}
		return await res.json();
	} catch (err) {
		console.error('Error fetching global audit:', err);
		return [];
	}
}

export async function fetchDeadLetterEvents(): Promise<any[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/dead_letter_events`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			return [];
		}
		return await res.json();
	} catch (err) {
		console.error('Error fetching dead letter events:', err);
		return [];
	}
}

export async function checkBackendHealth(): Promise<boolean> {
	try {
		const res = await fetch(`${API_BASE_URL}/health`, {
			cache: 'no-store',
		});
		return res.ok;
	} catch {
		return false;
	}
}
