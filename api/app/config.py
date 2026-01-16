from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  DATABASE_URL: str = Field(
      default="postgresql+psycopg://kyc:kyc_password@db:5432/kyc",
      description="SQLAlchemy URL for Postgres",
  )


settings = Settings()

