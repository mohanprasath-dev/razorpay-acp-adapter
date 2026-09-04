"""Authentication & Agent Registration Router for Agentic Commerce Protocol (ACP)."""
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from backend.services.auth import register_agent

router = APIRouter(prefix='/agents', tags=['Agent Authentication'])


class RegisterAgentRequest(BaseModel):
	name: str = Field(default='Autonomous Buyer Agent', description='Human or agent identity name')


class RegisterAgentResponse(BaseModel):
	agent_id: str
	api_key: str
	name: str
	created_at: str


@router.post(
	'/register',
	status_code=status.HTTP_201_CREATED,
	response_model=RegisterAgentResponse,
	summary='Register Agent & Issue API Key'
)
async def register_agent_endpoint(request: RegisterAgentRequest):
	"""
	Issues a new API key for a named agent.
	Format: acp_agent_<32 hex chars>.
	Note: Open registration is provided for hackathon demonstration and test agent simulation.
	In production, this would be tied to merchant-scoped OAuth 2.0 / Agent Identity Registry.
	"""
	return register_agent(name=request.name)
