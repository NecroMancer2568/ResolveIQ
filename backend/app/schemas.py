from typing import Literal
from pydantic import BaseModel, Field

class TicketCreate(BaseModel):
    customer_message: str = Field(min_length=3)
    customer_context: dict = Field(default_factory=dict)

class Context(BaseModel):
    intent: str = "unknown"
    product: str | None = None
    customer_segment: str | None = None
    region: str | None = None
    issue: str | None = None
    urgency: str = "normal"
    account_state: str | None = None

class Evidence(BaseModel):
    id: str
    title: str
    content: str
    source_type: str
    score: float = 0.0
    authority: float = 0.0
    freshness: float = 0.0
    context_match: float = 0.0
    metadata: dict = Field(default_factory=dict)

class ClaimVerification(BaseModel):
    claim: str
    status: Literal["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED"]
    evidence_ids: list[str] = Field(default_factory=list)
    entailment: float = 0.0

class DraftResponse(BaseModel):
    summary: str
    resolution: str
    draft_response: str
    evidence_ids: list[str]
    confidence: float
    requires_review: bool = True
    decision: Literal["RESOLVE", "CLARIFY", "ABSTAIN", "ESCALATE"]
    verification: dict
    context: Context

class FeedbackCreate(BaseModel):
    decision: Literal["approved", "edited", "rejected"]
    edited_response: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    reason: str | None = None
