from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from mangum import Mangum
from starlette.exceptions import HTTPException

from app.config import Paths
from app.routers import get_routers

app = FastAPI()
for router in get_routers():
    app.include_router(router)


class SpaStaticFiles(StaticFiles):
    """없는 경로는 index.html로 돌려 React Router가 처리하게 합니다."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404:
                raise
            return await super().get_response("index.html", scope)


# API 라우트가 먼저 매칭되고, 나머지 경로는 run.sh가 static/에 복사한 웹 빌드가 받습니다.
if Paths.STATIC_DIR.is_dir():
    app.mount("/", SpaStaticFiles(directory=Paths.STATIC_DIR, html=True))

lambda_handler = Mangum(app)
