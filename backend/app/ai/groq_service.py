"""Thin, independent wrapper around the Groq API.

The API key and model are read from the environment and are never exposed to
the frontend. Any failure is translated into a friendly exception so routers
can return a clean HTTP error.
"""
from groq import Groq

from app.ai import prompts
from app.config import settings


class AIServiceError(Exception):
    """Raised when the AI provider is unavailable or misconfigured."""


def _client() -> Groq:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("your_"):
        raise AIServiceError(
            "AI is not configured. Set GROQ_API_KEY in backend/.env and restart the server."
        )
    return Groq(api_key=settings.GROQ_API_KEY)


def generate_ai_response(
    prompt: str | list[dict],
    system_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    """Send a single-turn prompt to Groq and return the text response."""
    if isinstance(prompt, str):
        if not prompt or not prompt.strip():
            raise AIServiceError("No text was provided to analyse.")
    elif not prompt:
        raise AIServiceError("No content was provided to analyse.")

    try:
        client = _client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        )
    except AIServiceError:
        raise
    except Exception as exc:  # network errors, auth errors, rate limits
        message = str(exc)
        if "model_not_found" in message or "does not exist" in message:
            raise AIServiceError(
                f"The configured Groq model '{settings.GROQ_MODEL}' is not available. "
                "Update GROQ_MODEL in backend/.env."
            ) from exc
        if "Invalid API Key" in message or "401" in message:
            raise AIServiceError(
                "The Groq API key was rejected. Update GROQ_API_KEY in backend/.env."
            ) from exc
        raise AIServiceError(
            "The AI service is currently unavailable. Please try again shortly."
        ) from exc

    content = (response.choices[0].message.content or "").strip() if response.choices else ""
    if not content:
        raise AIServiceError("The AI service returned an empty response. Please try again.")
    return content


def analyze_report(report_text: str, document_name: str = "your report") -> str:
    """Explain an uploaded medical report in plain, cautious language."""
    user_prompt = (
        f"Document name: {document_name}\n\n"
        f"--- BEGIN EXTRACTED REPORT TEXT ---\n{report_text.strip()[:15000]}\n"
        "--- END EXTRACTED REPORT TEXT ---"
    )
    return generate_ai_response(user_prompt, prompts.REPORT_ANALYSIS_PROMPT, temperature=0.2)


def health_chat(message: str, attachment: dict | None = None) -> str:
    """Answer a healthcare education question, optionally with an attachment.

    ``attachment`` is either an image payload
    ``{"kind": "image", "filename", "content_type", "data_base64"}`` or
    extracted text ``{"kind": "text", "filename", "text"}``.
    """
    if attachment is None:
        user_content: str | list[dict] = message
    elif attachment.get("kind") == "image":
        user_content = [
            {
                "type": "text",
                "text": (
                    f"The user attached an image file named '{attachment['filename']}'. "
                    f"{message}"
                ),
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": (
                        f"data:{attachment['content_type']};base64,"
                        f"{attachment['data_base64']}"
                    )
                },
            },
        ]
    else:
        user_content = (
            f"The user attached a file named '{attachment['filename']}'.\n"
            "--- BEGIN ATTACHED FILE TEXT ---\n"
            f"{attachment.get('text', '')[:20000]}\n"
            "--- END ATTACHED FILE TEXT ---\n\n"
            f"User question: {message}"
        )
    return generate_ai_response(user_content, prompts.HEALTH_CHAT_PROMPT, temperature=0.4, max_tokens=1200)
