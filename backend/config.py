from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		env_file=('.env', '.env.local'),
		env_file_encoding='utf-8',
		extra='ignore'
	)

	# Application Settings
	ENVIRONMENT: str = 'development'
	PORT: int = 8000
	HOST: str = '0.0.0.0'

	# Razorpay Test Mode Credentials
	RAZORPAY_KEY_ID: str = 'rzp_test_placeholder'
	RAZORPAY_KEY_SECRET: str = 'placeholder_secret'

	# Firestore Configuration
	FIRESTORE_PROJECT_ID: str = 'razorpay-acp-test'
	FIRESTORE_DATABASE: str = '(default)'
	GOOGLE_APPLICATION_CREDENTIALS: str = ''

	# ACP Protocol Settings
	ACP_SPEC_VERSION: str = '2026-04-17'
	MERCHANT_NAME: str = 'Razorpay ACP Merchant Store'
	SUPPORTED_CURRENCIES: str = 'INR'

	# Webhook Configuration (Real Outbound Callbacks with HMAC)
	WEBHOOK_TARGET_URL: str = ''
	WEBHOOK_SECRET: str = 'razorpay_acp_webhook_secret_2026'

	# Rate Limiting (In-memory sliding window for single-instance adapter)
	RATE_LIMIT_PER_MINUTE: int = 120

	# Session TTL / Expiry (in minutes)
	SESSION_TTL_MINUTES: int = 30

	@field_validator('MERCHANT_NAME')
	@classmethod
	def sanitize_merchant_name(cls, v: str) -> str:
		if 'razorpay' not in v.lower():
			return 'Razorpay ACP Merchant Store'
		return v

	@field_validator('FIRESTORE_PROJECT_ID')
	@classmethod
	def sanitize_firestore_project(cls, v: str) -> str:
		if 'razorpay' not in v.lower():
			return 'razorpay-acp-test'
		return v

	@field_validator('WEBHOOK_SECRET')
	@classmethod
	def sanitize_webhook_secret(cls, v: str) -> str:
		if 'razorpay' not in v.lower():
			return 'razorpay_acp_webhook_secret_2026'
		return v


@lru_cache()
def get_settings() -> Settings:
	return Settings()
