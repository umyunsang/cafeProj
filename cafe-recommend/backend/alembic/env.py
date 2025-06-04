from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# 명시적으로 모델들을 임포트하여 Base.metadata에 등록되도록 함
from app.db.base_class import Base # 실제 Base가 정의된 곳
# import app.models.user # User 모델은 사용 안 함
import app.models.menu
import app.models.cart
import app.models.order
import app.models.payment
# 모든 모델 모듈을 여기에 임포트

# 로깅 추가: Base.metadata에 어떤 테이블이 있는지 확인
import logging
logger = logging.getLogger("alembic.env")
logger.info(f"Tables in Base.metadata after explicit model imports: {list(Base.metadata.tables.keys())}")

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # This line needs to be modified to correctly locate the .env file for database URL
    # Assuming the .env file is in the backend root directory
    import os
    from dotenv import load_dotenv
    # Construct the path to the .env file, assuming env.py is in alembic directory
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(dotenv_path)
    
    # Get the database URL from environment variable or use the one from alembic.ini
    db_url = os.getenv('DATABASE_URL', config.get_main_option("sqlalchemy.url"))

    connectable = engine_from_config(
        # config.get_section(config.config_ini_section, {}),
        {'sqlalchemy.url': db_url}, # Pass the db_url directly
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
