import os
from typing import List
import httpx
from app.checker.rules.templates import template_matcher

TRANSLATION_API_URL = os.getenv("TRANSLATION_API_URL", "")
TRANSLATION_API_KEY = os.getenv("TRANSLATION_API_KEY", "")

async def translate_text_list(texts: List[str], target_lang: str) -> List[str]:
    """
    Translates a list of explanation or advice sentences to the target UI language (hi, te, ta, kn).
    - If target_lang is 'en', returns original texts.
    - If an external translation API or LLM service is configured, attempts translation with a 3.0s timeout.
    - If offline, network failure, or not configured, gracefully falls back to template dictionary or English.
    """
    if not texts or not target_lang or target_lang == "en":
        return texts

    # Attempt AI / HTTP translation if endpoint configured
    if TRANSLATION_API_URL:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    TRANSLATION_API_URL,
                    json={"texts": texts, "target_lang": target_lang},
                    headers={"Authorization": f"Bearer {TRANSLATION_API_KEY}"} if TRANSLATION_API_KEY else {}
                )
                if res.status_code == 200:
                    data = res.json()
                    translated = data.get("translated_texts")
                    if isinstance(translated, list) and len(translated) == len(texts):
                        return translated
        except Exception:
            # Graceful offline fallback
            pass

    # Template-based fallback for standard sentences
    translated_list = []
    for t in texts:
        # Check if text matches known explain templates
        matched = False
        for key, entry in template_matcher.explain_templates.items():
            if isinstance(entry, dict) and entry.get("en") == t:
                translated_list.append(entry.get(target_lang) or t)
                matched = True
                break
        if not matched:
            translated_list.append(t)

    return translated_list

