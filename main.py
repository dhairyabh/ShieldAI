from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import os
import json
import re
from dotenv import load_dotenv

# Try to import groq, but handle if it's missing just in case
try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

load_dotenv()

app = FastAPI(title="ShieldAI API")

# Setup CORS to allow the local frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class AnalyzeRequest(BaseModel):
    text: str

class AnalyzeResponse(BaseModel):
    verdict: str = Field(description="NEUTRALIZE, MONITOR, or SAFE")
    threat_type: str = Field(description="The category of the threat, e.g., UPI_FRAUD")
    confidence: float = Field(description="Confidence score between 0 and 1")
    reason: str = Field(description="A brief explanation of why this verdict was reached")
    threats: List[str] = Field(description="List of detected threat indicators")
    risk_score: int = Field(description="Risk score between 0 and 100")
    action: str = Field(description="The action taken based on the verdict")

def regex_fallback_engine(text: str) -> AnalyzeResponse:
    lower = text.lower()

    upi_patterns = re.compile(r'(upi|@paytm|@upi|@ybl|@oksbi|@okaxis|transfer|send money|pay now)')
    urgency_patterns = re.compile(r'(urgent|immediate|block|suspend|deactivat|tonight|24 hours|right now|don\'t delay|act now)')
    lottery_patterns = re.compile(r'(won|winner|prize|lucky draw|congratulation|claim|reward)')
    impersonation = re.compile(r'(sbi|rbi|phonepe|paytm|jio|hdfc|icici|government|police|bank|income tax)')
    otp_patterns = re.compile(r'(otp|one\.time\.password|share.*code|send.*code)')
    aadhaar_patterns = re.compile(r'(aadhaar|pan card|kyc|identity proof)')

    score = 0
    threats = []
    threat_type = 'UNKNOWN'

    if upi_patterns.search(lower):
        score += 35
        threats.append('UPI Request Detected')
        threat_type = 'UPI_FRAUD'
    if urgency_patterns.search(lower):
        score += 25
        threats.append('Forced Urgency')
    if lottery_patterns.search(lower):
        score += 20
        threats.append('Lottery/Prize Scam')
        threat_type = 'LOTTERY_FRAUD'
    if impersonation.search(lower):
        score += 20
        threats.append('Identity Impersonation')
    if otp_patterns.search(lower):
        score += 30
        threats.append('OTP Harvesting Attempt')
    if aadhaar_patterns.search(lower):
        score += 15
        threats.append('PII Data Harvesting')
    if re.search(r'₹|rs\.|rupee', lower):
        score += 10
        threats.append('Financial Transaction')

    confidence = min(score / 100.0, 0.99)

    if score >= 45:
        verdict = 'NEUTRALIZE'
        reason = ' + '.join(threats[:2]) + ' — high-confidence scam pattern (Fallback Engine)'
    elif score > 0:
        verdict = 'MONITOR'
        reason = 'Partial scam indicators — flagged for review (Fallback Engine)'
        if threat_type == 'UNKNOWN':
            threat_type = 'SUSPICIOUS'
    else:
        verdict = 'SAFE'
        reason = 'No scam patterns detected (Fallback Engine)'
        threat_type = 'NONE'
        threats = []

    action = 'Call blocked. User notified.' if verdict == 'NEUTRALIZE' else \
             'Flagged for 24h monitoring.' if verdict == 'MONITOR' else \
             'Message delivered normally.'

    return AnalyzeResponse(
        verdict=verdict,
        threat_type=threat_type,
        confidence=round(confidence, 2),
        reason=reason,
        threats=threats,
        risk_score=score,
        action=action
    )

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    api_key = os.getenv("GROQ_API_KEY")
    
    # If no valid Groq API key is configured, fallback to Regex Engine
    if not HAS_GROQ or not api_key:
        return regex_fallback_engine(request.text)

    # Initialize Groq client
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are an autonomous AI middleware agent that detects financial scams.
    Analyze the following message and determine the threat level.
    
    Return your analysis strictly as a JSON object with the following schema:
    {{
        "verdict": "NEUTRALIZE" | "MONITOR" | "SAFE",
        "threat_type": "string (e.g. UPI_FRAUD, SUSPICIOUS, NONE)",
        "confidence": float (0.0 to 1.0),
        "reason": "string (short explanation)",
        "threats": ["string", "string"],
        "risk_score": integer (0 to 100),
        "action": "string (e.g. 'Call blocked. User notified.')"
    }}
    
    Message to analyze:
    "{request.text}"
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a highly accurate scam detection API. Output ONLY valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        response_content = completion.choices[0].message.content
        data = json.loads(response_content)
        
        # Ensure the fallback schema aligns by passing it through the Pydantic model
        return AnalyzeResponse(**data)
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        # Fallback to regex engine if LLM fails
        return regex_fallback_engine(request.text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
