import os
import re
import json
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class GroqClient:
    """Wrapper for Groq API SDK with automatic model fallback and retry logic."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = (
            api_key
            or os.getenv("GROQ_API_KEY")
            or os.getenv("GEMINI_API_KEY")
        )
        self.model = (
            model
            or os.getenv("GROQ_MODEL")
            or "qwen/qwen3.8-27b"
        )
        self.client = None

        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key, max_retries=0)
                logger.info("Initialized Groq Client with primary model: %s", self.model)
            except Exception as e:
                logger.error("Failed to initialize Groq Client: %s", e)
        else:
            logger.warning("GROQ_API_KEY not found in environment. Add it to backend/.env")

    def is_configured(self) -> bool:
        return self.client is not None

    def _get_model_candidates(self) -> list[str]:
        """Returns ordered list of models to try in case of quota or demand issues."""
        candidates = [self.model]
        fallbacks = [
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.6-27b",
            "groq/compound",
            "groq/compound-mini",
        ]
        for fb in fallbacks:
            if fb not in candidates:
                candidates.append(fb)
        return candidates

    def generate_text(self, prompt: str, system_instruction: str | None = None) -> str:
        """Generate textual response using Groq with automatic model fallback."""
        if not self.is_configured():
            return (
                "⚠️ Groq API Key not configured. "
                "Please add `GROQ_API_KEY=your_key` to your `backend/.env` file."
            )

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        last_error = None
        for candidate_model in self._get_model_candidates():
            for attempt in range(1, 3):
                try:
                    response = self.client.chat.completions.create(
                        model=candidate_model,
                        messages=messages,
                        temperature=0.2,
                    )
                    content = response.choices[0].message.content
                    return content or "No response received from model."

                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    logger.warning(
                        "Groq generation with %s (attempt %d) failed: %s",
                        candidate_model,
                        attempt,
                        err_str[:120],
                    )

                    # Fail over immediately on missing model (404), rate limit (429), or server outage (500/503)
                    if any(code in err_str for code in ["404", "model_not_found", "429", "rate_limit", "503", "500", "UNAVAILABLE"]):
                        break
                    time.sleep(1)

        err_msg = str(last_error)
        if "429" in err_msg or "rate_limit" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            return (
                "⚠️ **Groq API rate limit reached (429).**\n\n"
                "The relevant manual excerpts were successfully retrieved and listed below. "
                "Please wait a few moments and click **'Ask Question'** again."
            )
        elif "503" in err_msg or "500" in err_msg or "UNAVAILABLE" in err_msg:
            return (
                "⚠️ **Groq API is temporarily experiencing high demand or outage.**\n\n"
                "The relevant manual excerpts were successfully retrieved and listed below. "
                "Please wait a few moments and click **'Ask Question'** again to generate the answer."
            )

        return f"⚠️ Error generating answer from Groq: {err_msg}"

    def generate_json(self, prompt: str, system_instruction: str | None = None) -> dict:
        """Generate structured JSON response using Groq with automatic model fallback."""
        if not self.is_configured():
            return {
                "error": "Groq API Key not configured.",
                "possible_causes": [
                    "GROQ_API_KEY is not configured in backend/.env",
                    "A valid Groq API key is required for generative diagnosis."
                ],
                "recommended_actions": [
                    "Obtain an API key from https://console.groq.com/",
                    "Add GROQ_API_KEY=<your-key> to backend/.env",
                    "Restart the backend server"
                ]
            }

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        last_error = None
        for candidate_model in self._get_model_candidates():
            for attempt in range(1, 3):
                try:
                    response = self.client.chat.completions.create(
                        model=candidate_model,
                        messages=messages,
                        response_format={"type": "json_object"},
                        temperature=0.1,
                    )
                    text = response.choices[0].message.content or "{}"
                    # Strip possible markdown code fences (```json ... ```)
                    cleaned_text = re.sub(r"^```(?:json)?\s*", "", text.strip())
                    cleaned_text = re.sub(r"\s*```$", "", cleaned_text.strip())
                    return json.loads(cleaned_text)

                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    logger.warning(
                        "Groq JSON generation with %s (attempt %d) failed: %s",
                        candidate_model,
                        attempt,
                        err_str[:120],
                    )

                    if any(code in err_str for code in ["404", "model_not_found", "429", "rate_limit", "503", "500", "UNAVAILABLE"]):
                        break
                    time.sleep(1)

        err_msg = str(last_error)
        return {
            "error": err_msg,
            "possible_causes": [
                "Temporary Groq capacity limit (429/503)." if ("429" in err_msg or "503" in err_msg) else f"Generation error: {err_msg}"
            ],
            "recommended_actions": [
                "Please wait a few moments and submit the request again.",
                "Check the retrieved sources below for reference."
            ]
        }


# Backwards compatibility aliases
LLMClient = GroqClient
GeminiClient = GroqClient
