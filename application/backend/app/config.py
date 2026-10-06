from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    """Runtime configuration, read from OPSPULSE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="OPSPULSE_", env_file=".env", extra="ignore")

    app_name: str = "OpsPulse"
    version: str = "1.0.0"
    environment: str = "development"
    git_sha: str = "local"
    log_level: str = "INFO"
    cors_origins: list[str] = []
    seed_demo_data: bool = False

    # Either a full DATABASE_URL, or the individual parts (the Kubernetes Secret provides the password).
    database_url: str | None = None
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "opspulse"
    db_user: str = "opspulse"
    db_password: SecretStr | None = None

    @property
    def sqlalchemy_url(self) -> URL | str:
        if self.database_url:
            return self.database_url
        if self.db_password is None:
            raise ValueError("Set OPSPULSE_DATABASE_URL or OPSPULSE_DB_PASSWORD")
        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
