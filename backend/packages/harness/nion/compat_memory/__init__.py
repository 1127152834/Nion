"""Explicit compatibility-only memory namespace.

This package exists to make the remaining file-backed memory storage lane
visibly legacy. Runtime mainline code should prefer Memory OS instead.
"""

from .storage import FileMemoryStorage

__all__ = ["FileMemoryStorage"]
