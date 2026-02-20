from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Only database connection settings remain here.
    JWT key, encryption key, and app password are managed by secrets_manager.py
    and persisted to the app_data Docker volume — no .env file needed.
    """
    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_user: str = "medvault"
    postgres_password: str = "medvault"
    postgres_db: str = "medvault"

    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
