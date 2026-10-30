from dataclasses import dataclass
from pathlib import Path


@dataclass
class Paths:
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ROUTERS_DIR: Path = BASE_DIR.joinpath("app", "routers")
    STATIC_DIR: Path = BASE_DIR.joinpath("static")
