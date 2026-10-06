from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "ResolveIQ"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./resolveiq.db"
    retriever_provider: str = "local"
    embedding_provider: str = "local"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    azure_search_endpoint: str | None = None
    azure_search_api_key: str | None = None
    azure_search_index: str = "resolveiq"
    azure_search_semantic_config: str = "resolveiq-semantic"
    foundry_endpoint: str | None = None
    foundry_api_key: str | None = None
    foundry_model: str | None = None
    verification_provider: str = "deterministic"
    nli_model: str = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
    cors_origins: str = "http://localhost:5173"
    confidence_regenerate_threshold: float = 0.55
    max_evidence: int = 8
    ssl_cert_file: str | None = None

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
