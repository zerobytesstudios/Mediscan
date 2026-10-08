"""Shared Pydantic types."""
import re
from typing import Annotated

from pydantic import AfterValidator

# Deliberately permissive: local development addresses such as
# admin@mediscan.local must be accepted (email-validator's strict mode
# rejects reserved TLDs like .local).
EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?"
                           r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$")


def _normalise_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address")
    return email


EmailAddress = Annotated[str, AfterValidator(_normalise_email)]
