"""General-purpose utility helpers."""

import re
import unicodedata


def slugify(value: str, separator: str = "-") -> str:
    """Convert a string to a URL-safe slug."""
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-_\s]+", separator, value)
