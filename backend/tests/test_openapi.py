import json
from pathlib import Path

from main import app

SPEC = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"


def test_openapi_json_is_up_to_date():
    assert app.openapi() == json.loads(SPEC.read_text()), (
        "docs/openapi.json is stale. Re-export it:\n"
        'cd backend && python -c "import json; from main import app; '
        'print(json.dumps(app.openapi(), indent=2))" > ../docs/openapi.json'
    )
