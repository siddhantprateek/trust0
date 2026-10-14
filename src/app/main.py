import asyncio
import logging
import socket
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import get_settings
from app.db import init_db
from app.services import local_models

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
# httpx logs every request URL at INFO, and some providers (SerpAPI, Google) take their API key in the URL
logging.getLogger("httpx").setLevel(logging.WARNING)

if get_settings().prefer_ipv4:
    # Applies to every client in the process (httpx, the Anthropic SDK, yt-dlp); IPv6 stays as a fallback
    _getaddrinfo = socket.getaddrinfo
    socket.getaddrinfo = lambda *args, **kwargs: sorted(_getaddrinfo(*args, **kwargs), key=lambda info: info[0] != socket.AF_INET)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    # Load t0-vision and Whisper in the background; the API serves requests meanwhile
    warm = asyncio.create_task(asyncio.to_thread(local_models.warm_up))
    yield
    warm.cancel()


app = FastAPI(title="trust0 API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    # The browser extension calls from chrome-extension://<id>, which changes per install in development
    allow_origin_regex=r"^chrome-extension://[a-p]{32}$",
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)

app.include_router(router)
