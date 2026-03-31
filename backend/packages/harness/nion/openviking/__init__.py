"""Embedded OpenViking notebook ingest and retrieval runtime."""

from nion.openviking.chunk_store import NotebookChunkSearchResult, OpenVikingChunkStore
from nion.openviking.chunker import NotebookChunk, chunk_notebook_markdown
from nion.openviking.context_assembler import build_continuity_context_block
from nion.openviking.context_pack import (
    NotebookContextPack,
    NotebookContextPackItem,
    build_context_pack_markdown,
)
from nion.openviking.contracts import OpenVikingResourceDomain, OpenVikingSourceKind
from nion.openviking.models import NotebookResourceRecord
from nion.openviking.notebook_ingest import (
    EmbeddedNotebookIngestService,
    NotebookIngestResult,
)
from nion.openviking.notebook_projection import project_notebook_note
from nion.openviking.resource_store import OpenVikingResourceStore
from nion.openviking.retrieval_intent import RetrievalIntent, classify_retrieval_intent
from nion.openviking.runtime_retriever import RuntimeNotebookRetriever
from nion.openviking.uri import notebook_resource_uri

__all__ = [
    "NotebookChunk",
    "NotebookChunkSearchResult",
    "NotebookContextPack",
    "NotebookContextPackItem",
    "NotebookIngestResult",
    "NotebookResourceRecord",
    "EmbeddedNotebookIngestService",
    "OpenVikingResourceDomain",
    "OpenVikingChunkStore",
    "OpenVikingResourceStore",
    "OpenVikingSourceKind",
    "RuntimeNotebookRetriever",
    "RetrievalIntent",
    "build_continuity_context_block",
    "build_context_pack_markdown",
    "classify_retrieval_intent",
    "chunk_notebook_markdown",
    "notebook_resource_uri",
    "project_notebook_note",
]
