from sqlalchemy import Table, MetaData
from core.dependencies import engine_mysql

metadata = MetaData()

delivery_challan = Table(
    "yora_delivery_challan",
    metadata,
    autoload_with=engine_mysql
)