from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		env_file='.env',
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

	# ACP Protocol Settings
	ACP_SPEC_VERSION: str = '2026-04-17'
	MERCHANT_NAME: str = 'TaskDrift Merchant Store'


@lru_cache()
def get_settings() -> Settings:
	return Settings()
