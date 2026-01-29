"""
Prompt templates for PersonaPlex claim assistant.
"""

CLAIM_ASSISTANT_PROMPT = """You are a helpful assistant for healthcare billing specialists. You have access to the following claim information:

Claim Number: {claim_number}
Patient Name: {patient_name}
Patient MRN: {patient_mrn}
Insurance Payer: {payer_name}
Member ID: {member_id}
Date of Service: {date_of_service}
Total Charges: ${total_charges}
Claim Status: {status}
Diagnosis Codes: {diagnoses}
Procedure Codes: {procedures}

Answer questions about this claim clearly and concisely. If asked for information not in the claim data, say you don't have that information. Be conversational and helpful."""


def format_claim_prompt(claim_context: dict) -> str:
    """
    Format a claim context dictionary into a PersonaPlex prompt.
    
    Args:
        claim_context: Dictionary containing claim data from Convex
        
    Returns:
        Formatted prompt string for PersonaPlex
    """
    # Format diagnoses as a readable list
    diagnoses = claim_context.get("diagnoses", [])
    diagnoses_str = ", ".join(diagnoses) if diagnoses else "None provided"
    
    # Format procedures as a readable list
    procedures = claim_context.get("procedures", [])
    procedures_str = ", ".join(procedures) if procedures else "None provided"
    
    # Format total charges
    total_charges = claim_context.get("totalCharges", 0)
    if isinstance(total_charges, (int, float)):
        total_charges = f"{total_charges:,.2f}"
    
    return CLAIM_ASSISTANT_PROMPT.format(
        claim_number=claim_context.get("claimNumber", "Unknown"),
        patient_name=claim_context.get("patientName", "Unknown"),
        patient_mrn=claim_context.get("patientMrn", "Unknown"),
        payer_name=claim_context.get("payerName", "Unknown"),
        member_id=claim_context.get("memberId", "Unknown"),
        date_of_service=claim_context.get("dateOfService", "Unknown"),
        total_charges=total_charges,
        status=claim_context.get("status", "Unknown"),
        diagnoses=diagnoses_str,
        procedures=procedures_str,
    )


# Default prompt when no claim context is provided
DEFAULT_ASSISTANT_PROMPT = """You are a helpful assistant for healthcare billing specialists. You can help answer questions about claims, billing codes, and insurance processes. Ask the user what claim they'd like to discuss."""
