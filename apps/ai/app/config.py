from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_access_secret: str
    api_service_key: str
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:4000"]
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
