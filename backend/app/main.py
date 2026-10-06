import os
# Apply SSL cert early — must happen before aiohttp/Azure SDK imports resolve
def _apply_ssl_cert():
    from pathlib import Path
    env_file=Path(__file__).parent.parent/".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("SSL_CERT_FILE="):
                cert=line.split("=",1)[1].strip()
                if cert and not os.environ.get("SSL_CERT_FILE"):
                    os.environ["SSL_CERT_FILE"]=cert
                break
_apply_ssl_cert()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.db.session import init_db
from app.api.routes import router

settings=get_settings(); app=FastAPI(title=settings.app_name,version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(router,prefix=settings.api_prefix)

@app.on_event("startup")
async def startup():
    # Ensure SSL certs are set for aiohttp/Azure SDK if configured in .env
    _s=get_settings()
    if getattr(_s,'ssl_cert_file',None) and not os.environ.get('SSL_CERT_FILE'):
        os.environ['SSL_CERT_FILE']=_s.ssl_cert_file
    await init_db()

@app.get("/health")
async def health(): return {"status":"ok","service":"resolveiq"}
