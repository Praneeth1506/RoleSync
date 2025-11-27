def explain_match(match_components):
    required = match_components.get("required_score", 0)
    preferred = match_components.get("preferred_score", 0)
    experience = match_components.get("experience_score", 0)

    reasons = []
    if required < 0.6:
        reasons.append("Missing several core required skills.")
    else:
        reasons.append("Has most core required skills.")

    if preferred >= 0.5:
        reasons.append("Also has several preferred skills (plus).")
    else:
        reasons.append("Lacks many preferred skills (opportunity to upskill).")

    if experience < 0.5:
        reasons.append("Insufficient experience for the stated requirement.")
    else:
        reasons.append("Experience level matches expectations.")

    explanation = " ".join(reasons)
    return {
        "explanation": explanation,
        "reasons": reasons
    }
