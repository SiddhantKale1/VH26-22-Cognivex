#!/usr/bin/env python3
"""Search indexed manuals from the command line.

Usage:
    python scripts/test_search.py "What does E404 mean?"
    python scripts/test_search.py "spindle overheating" --top_k 3
"""

import sys
import argparse
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv(project_root / ".env")

from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.qdrant_service import QdrantService
from app.retrieval.vector_search import VectorSearch
from app.retrieval.retriever import Retriever


def main():
    """Run a search query against indexed manuals."""
    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Search indexed machine manuals.")
    parser.add_argument("query", help="Search query text")
    parser.add_argument("--top_k", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--machine", type=str, default=None, help="Filter by machine name")
    parser.add_argument("--model", type=str, default=None, help="Filter by model number")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Machine Troubleshooter — Search")
    print(f"{'='*60}")
    print(f"  Query: {args.query}")
    if args.machine:
        print(f"  Machine filter: {args.machine}")
    if args.model:
        print(f"  Model filter: {args.model}")
    print(f"{'='*60}\n")

    # Initialize services
    print("Loading embedding model...")
    embedding_service = EmbeddingService()

    print("Connecting to Qdrant...")
    qdrant_service = QdrantService()

    # Build retriever
    vector_search = VectorSearch(embedding_service, qdrant_service)
    retriever = Retriever(vector_search)

    # Run search
    print("Searching...\n")
    response = retriever.retrieve(
        query=args.query,
        top_k=args.top_k,
        machine=args.machine,
        model=args.model,
    )

    # Display results
    if not response.results:
        print(response.message or "No results found.")
        return

    for i, result in enumerate(response.results, 1):
        print(f"{'─'*60}")
        print(f"  RESULT {i}")
        print(f"{'─'*60}")
        print(f"  Score:      {result.score}")
        print(f"  Source:     {result.source}")
        print(f"  Page:       {result.page}")
        if result.section:
            print(f"  Section:    {result.section}")
        if result.error_code:
            print(f"  Error Code: {result.error_code}")
        if result.machine:
            print(f"  Machine:    {result.machine}")
        if result.model:
            print(f"  Model:      {result.model}")
        print()
        # Show text preview (first 500 chars)
        text_preview = result.text[:500]
        if len(result.text) > 500:
            text_preview += "..."
        print(f"  {text_preview}")
        print()

    print(f"{'='*60}")
    print(f"  Total results: {len(response.results)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
