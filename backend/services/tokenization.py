"""Delegated Payment Method Tokenization Service for ACP Adapter.
Models the ACP delegate_payment token handoff layer before merchant charges.
Standing stub layer for PCI-scoped agent tokenization.
"""
import re
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TOKEN_PREFIX = 'pm_tok_'
TOKEN_REGEX = re.compile(r'^pm_tok_[a-zA-Z0-9_-]{8,64}$')


def generate_payment_token() -> str:
	"""Generates an ACP-compliant delegated payment method token."""
	return f'{TOKEN_PREFIX}{uuid.uuid4().hex[:16]}'


def validate_payment_token(token: Optional[str]) -> bool:
	"""
	Validates that the provided payment method token conforms to the ACP specification.
	Must start with 'pm_tok_' and contain valid alphanumeric/dash characters.
	"""
	if not token or not isinstance(token, str):
		return False
	return bool(TOKEN_REGEX.match(token.strip()))
