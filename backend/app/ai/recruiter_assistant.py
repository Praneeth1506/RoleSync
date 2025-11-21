def answer_recruiter_query(query, history, job_role, candidates):
    """
    history = [
      {"sender": "recruiter", "text": "..."},
      {"sender": "ai", "text": "..."},
      ...
    ]
    """

    history_text = ""
    for msg in history[-10:]:  # last 10 messages
        role = "User" if msg["sender"] == "recruiter" else "Assistant"
        history_text += f"{role}: {msg['text']}\n"

    job_role_txt = json.dumps(job_role or {}, indent=2)
    cand_txt = json.dumps(candidates, indent=2)

    prompt = f"""
    You are an AI recruitment assistant.

    Job Role:
    {job_role_txt}

    Top Candidates:
    {cand_txt}

    Conversation History:
    {history_text}

    New recruiter message:
    {query}

    Respond helpfully.
    Return ONLY JSON with:
    {{
      "reply": "<your-message-here>",
      "suggested_actions": []
    }}
    """

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except:
        return {"reply": "Could not process query.", "suggested_actions": []}
