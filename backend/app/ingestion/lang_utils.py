"""
Multilingual language detection and script classification utility for Cognivex RAG.
Supports Unicode script range analysis for CJK (Japanese/Chinese/Korean), Cyrillic, 
Arabic, and European Latin scripts, with ISO code to display name mappings.
"""

import re
from typing import Dict, List, Optional, Tuple

LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "ja": "日本語 (Japanese)",
    "de": "Deutsch (German)",
    "es": "Español (Spanish)",
    "fr": "Français (French)",
    "it": "Italiano (Italian)",
    "zh": "中文 (Chinese)",
    "ko": "한국어 (Korean)",
    "pt": "Português (Portuguese)",
    "ru": "Русский (Russian)",
    "hi": "हिन्दी (Hindi)"
}

# Unicode Script Ranges
RE_JAPANESE = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\uFF66-\uFF9F]")  # Hiragana, Katakana, Half-width kana
RE_CHINESE = re.compile(r"[\u4E00-\u9FFF\u3400-\u4DBF]")  # CJK Ideographs
RE_KOREAN = re.compile(r"[\uAC00-\uD7AF\u1100-\u11FF]")   # Hangul
RE_CYRILLIC = re.compile(r"[\u0400-\u04FF]")
RE_ARABIC = re.compile(r"[\u0600-\u06FF]")
RE_DEVANAGARI = re.compile(r"[\u0900-\u097F]")

# Common language marker words
GERMAN_MARKERS = {"der", "die", "das", "und", "ist", "fehler", "störung", "ursache", "massnahme", "antrieb", "motor", "spannung"}
SPANISH_MARKERS = {"el", "la", "los", "las", "y", "en", "fallo", "error", "alarma", "causa", "solución", "motor", "tensión"}
FRENCH_MARKERS = {"le", "la", "les", "et", "dans", "défaut", "erreur", "alarme", "cause", "action", "moteur", "tension"}
ITALIAN_MARKERS = {"il", "la", "gli", "le", "ed", "guasto", "errore", "allarme", "causa", "motore", "tensione"}


def detect_script_or_language(text: str) -> str:
    """
    Detect the primary language/script of a given text snippet.
    Returns ISO 639-1 code ('en', 'ja', 'de', 'es', 'fr', 'zh', 'ko', 'ru', 'hi', etc.).
    """
    if not text or not text.strip():
        return "en"

    clean_text = text.strip()
    total_chars = len(clean_text)

    # 1. Check Japanese (Presence of Hiragana or Katakana confirms Japanese over pure CJK)
    jp_chars = len(RE_JAPANESE.findall(clean_text))
    if jp_chars > 0 or (jp_chars + len(RE_CHINESE.findall(clean_text))) / max(total_chars, 1) > 0.15:
        if jp_chars > 0 or "の" in clean_text or "に" in clean_text or "は" in clean_text or "エラー" in clean_text:
            return "ja"
        return "zh"

    # 2. Check Korean Hangul
    if len(RE_KOREAN.findall(clean_text)) / max(total_chars, 1) > 0.1:
        return "ko"

    # 3. Check Cyrillic (Russian)
    if len(RE_CYRILLIC.findall(clean_text)) / max(total_chars, 1) > 0.15:
        return "ru"

    # 4. Check Devanagari (Hindi)
    if len(RE_DEVANAGARI.findall(clean_text)) / max(total_chars, 1) > 0.15:
        return "hi"

    # 5. Check European Languages via word tokens
    words = set(re.findall(r"\b[a-zA-Zäöüßáéíóúñàèìòùâêîôûç]+\b", clean_text.lower()))
    
    if len(words & GERMAN_MARKERS) >= 2 or any(c in clean_text.lower() for c in ["störung", "maßnahmen", "ursachen", "antrieb"]):
        return "de"
    if len(words & SPANISH_MARKERS) >= 2 or any(c in clean_text.lower() for c in ["solución", "acción", "tensión"]):
        return "es"
    if len(words & FRENCH_MARKERS) >= 2 or any(c in clean_text.lower() for c in ["défaut", "réglage", "vérification"]):
        return "fr"
    if len(words & ITALIAN_MARKERS) >= 2:
        return "it"

    # Try langdetect if installed
    try:
        from langdetect import detect
        detected = detect(clean_text[:500])
        if detected in LANGUAGE_NAMES:
            return detected
    except Exception:
        pass

    return "en"


def get_language_display_name(code: str) -> str:
    """Return friendly display name for an ISO language code."""
    return LANGUAGE_NAMES.get(code.lower(), code.upper())


def get_suggested_languages(doc_lang: str, query_lang: str) -> List[Dict[str, str]]:
    """
    Generate language recommendation choices for the technician.
    Always includes English ('en'), plus the detected manual language and query language.
    """
    langs = {"en"}
    if doc_lang:
        langs.add(doc_lang.lower())
    if query_lang:
        langs.add(query_lang.lower())

    suggestions = []
    for code in sorted(langs):
        if code in LANGUAGE_NAMES:
            suggestions.append({
                "code": code,
                "name": LANGUAGE_NAMES[code],
                "is_default": code == "en"
            })
    return suggestions
