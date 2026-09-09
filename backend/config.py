import os

from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Central configuration for Digital Krishi Officer (DKO) backend."""
    
    # API Keys
    groq_api_key: str = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "").strip().strip('"').strip("'")
    hf_token: str = os.getenv("HF_TOKEN", "").strip().strip('"').strip("'")
    datagov_api_key: str = os.getenv("DATAGOVI_API_KEY", "").strip().strip('"').strip("'")
    tavily_api_key: str = os.getenv("TAVILY_API_KEY", "").strip().strip('"').strip("'")

    # Vector DB & Storage
    index_name: str = "dko-agri-v2"
    embed_model: str = "multilingual-e5-large"
    cache_dir: str = "foundational_memory"

    # LLM Models on Groq
    # Verified: openai/gpt-oss-120b natively handles multi-turn tool calling in LangGraph
    reason_model: str = "openai/gpt-oss-120b"
    # Fast model for auxiliary tasks like query rewriting and title generation
    fast_model: str = "openai/gpt-oss-20b"
    # Verified: qwen/qwen3.8-27b supports vision input cleanly on Groq
    vision_model: str = "qwen/qwen3.8-27b"

settings = Settings()

# Direct exports for backward compatibility across imports
groq_key = settings.groq_api_key
pinecone_key = settings.pinecone_api_key
hf_token = settings.hf_token
datagov_key = settings.datagov_api_key
tavily_key = settings.tavily_api_key

index_name = settings.index_name
embed_model = settings.embed_model
reason_model = settings.reason_model
fast_model = settings.fast_model
vision_model = settings.vision_model
cache_dir = settings.cache_dir
