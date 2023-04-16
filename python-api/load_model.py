from chromadb.utils import embedding_functions

ef = embedding_functions.InstructorEmbeddingFunction(
    model_name="hkunlp/instructor-large",
)

print(ef)