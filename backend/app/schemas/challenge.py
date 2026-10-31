from pydantic import BaseModel, Field

class ChallengeCreate(BaseModel):
    identifier_type: str = Field(..., min_length=1)
    identifier_value: str = Field(..., min_length=1)
    claimant_name: str = Field(..., min_length=1)
    contact_email: str = Field(..., min_length=3)
    proof_note: str = Field(..., min_length=1)

class ChallengeResponse(BaseModel):
    challenge_id: str
    status: str = "under_review"

