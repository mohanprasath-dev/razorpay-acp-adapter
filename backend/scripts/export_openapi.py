"""Export OpenAPI specification from FastAPI application to docs/openapi.json."""
import json
import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app

def export_openapi_spec(output_path: str = 'docs/openapi.json'):
	"""Generates and writes the full OpenAPI 3.1 JSON schema."""
	openapi_schema = app.openapi()
	os.makedirs(os.path.dirname(output_path), exist_ok=True)
	with open(output_path, 'w', encoding='utf-8') as f:
		json.dump(openapi_schema, f, indent=2)
	print(f'[OK] OpenAPI schema successfully exported to {output_path}')

if __name__ == '__main__':
	target = sys.argv[1] if len(sys.argv) > 1 else 'docs/openapi.json'
	export_openapi_spec(target)
