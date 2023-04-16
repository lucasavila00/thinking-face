import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from fastapi import FastAPI
from pydantic import BaseModel
import json
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",
    "https://thinking-face.vercel.app"
    "http://thinking-face.vercel.app"
]


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryInput(BaseModel):
    text: str


class QueryOutputItem(BaseModel):
    id: str
    distance: float
    headings: list[str]
    content: str


class QueryOutput(BaseModel):
    items: list[QueryOutputItem]


ef = embedding_functions.InstructorEmbeddingFunction(
    model_name="hkunlp/instructor-large",
)

SOURCES = [
    # "clickhouse",
    "react",
    # "mdn"
]

collection_map = {}
data_map = {}

for source in SOURCES:
    chroma_client = chromadb.Client(
        Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./db/",
        )
    )
    collection = chroma_client.get_collection(name=source, embedding_function=ef)

    print(f"Loaded {source} collection with len {collection.count()}")
    collection_map[source] = collection

    with open(f"../md-to-prompt/out/{source}.json", "r") as f:
        source_data = json.load(f)
    data_map = source_data


@app.post("/query/{model}")
def do_query(model: str, input: QueryInput) -> QueryOutput:
    collection = collection_map[model]
    results = collection.query(query_texts=[input.text], n_results=10)
    items = []
    for id, distance in zip(results["ids"][0], results["distances"][0]):
        idx = int(id)
        items.append(
            {
                "id": id,
                "distance": distance,
                "headings": data_map[idx]["headings"],
                "content": data_map[idx]["content"],
            }
        )
    return QueryOutput(items=items)
