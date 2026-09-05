from app.retrieval.embedding import (
    ManualVectorStore
)


if __name__ == "__main__":

    store = ManualVectorStore()

    store.build_index()