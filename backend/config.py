from functools import lru_cache
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
	FIRESTORE_PROJECT_ID: str = 'taskdrift-acp-test'
	FIRESTORE_DATABASE: str = '(default)'
	GOOGLE_APPLICATION_CREDENTIALS: str = ''

	# ACP Protocol Settings
	ACP_SPEC_VERSION: str = '2026-04-17'
	MERCHANT_NAME: str = 'TaskDrift Merchant Store'
	SUPPORTED_CURRENCIES: str = 'INR'

	# Webhook Configuration (Real Outbound Callbacks with HMAC)
	WEBHOOK_TARGET_URL: str = ''
	WEBHOOK_SECRET: str = 'taskdrift_acp_webhook_secret_2026'

	# Rate Limiting (In-memory sliding window for single-instance adapter)
	RATE_LIMIT_PER_MINUTE: int = 120

	# Session TTL / Expiry (in minutes)
	SESSION_TTL_MINUTES: int = 30


@lru_cache()
def get_settings() -> Settings:
	return Settings()
