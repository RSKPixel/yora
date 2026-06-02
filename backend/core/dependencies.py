from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from pathlib import Path
import os
from sqlalchemy import Table, MetaData

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username="sysadmin",
    password="Apple@1239",
    host="trialnerror.in",
    port=5432,
    database="yora",
)

MSQL_DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username="sysadmin",
    password="Apple@1239",
    host="trialnerror.in",
    port=3306,
    database="yora",
)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

engine_mysql = create_engine(
    MSQL_DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

metadata = MetaData()
inventory_master = Table("inventory_master", metadata, autoload_with=engine)
