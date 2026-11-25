"""Serve the built React application without masking missing API routes."""

from pathlib import PurePosixPath

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class SPAFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            # Only browser navigation falls back to index.html. A missing JS file
            # or API route must remain a 404 so failures are visible to the client.
            reserved = path.split("/", 1)[0] in {"api", "assets", "health", "ready", "metrics"}
            if exc.status_code != 404 or reserved or PurePosixPath(path).suffix:
                raise
            return await super().get_response("index.html", scope)
