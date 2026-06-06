import os
from dotenv import load_dotenv

from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment")

pc = Pinecone(api_key=PINECONE_API_KEY)

INDEX_NAME = os.getenv("PINECONE_INDEX", "sql-agent")

# Free local embedding model
embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

# This model gives 384 dimensions
EMBEDDING_DIMENSION = 384


def get_index():
    existing_indexes = [idx.name for idx in pc.list_indexes()]

    if INDEX_NAME not in existing_indexes:
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )

    return pc.Index(INDEX_NAME)


def embed_text(text):
    text=str(text)
    return embedding_model.encode(text).tolist()


def upsert_documents(texts: list[str], namespace: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.create_documents(texts)

    index = get_index()

    batch = []

    for i, chunk in enumerate(chunks):
        try:
            vec = embed_text(chunk.page_content)

            batch.append(
                {
                    "id": f"{namespace}-{i}",
                    "values": vec,
                    "metadata": {
                        "text": chunk.page_content
                    }
                }
            )

        except Exception as e:
            print("Embedding Error:", str(e))
            raise

    if batch:
        index.upsert(
            vectors=batch,
            namespace=namespace
        )


def retrieve_context(
    query: str,
    namespace: str,
    top_k: int = 4
):
    index = get_index()

    vec = embed_text(query)

    result = index.query(
        vector=vec,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True
    )

    return "\n\n".join(
        match.metadata.get("text", "")
        for match in result.matches
    )


def delete_namespace(namespace: str):
    get_index().delete(
        delete_all=True,
        namespace=namespace
    )
