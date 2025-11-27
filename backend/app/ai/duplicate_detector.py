import hashlib
from difflib import SequenceMatcher
from .resume_parser import extract_text

def file_hash(file_path):
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            h.update(chunk)
    return h.hexdigest()

def is_similar_text(a, b, threshold=0.85):
    return SequenceMatcher(None, a, b).ratio() >= threshold

def check_duplicate(file_path, db_check_fn):
    h = file_hash(file_path)
    existing = db_check_fn(h)
    if existing:
        return {"duplicate": True, "reason": "hash", "existing_id": existing.get("_id")}
    
    text = extract_text(file_path)
    text_candidates = db_check_fn(None, return_texts=True)
    for rec in text_candidates:
        if is_similar_text(text, rec.get("text", "")):
            return {"duplicate": True, "reason": "text", "existing_id": rec.get("_id")}
    return {"duplicate": False}
