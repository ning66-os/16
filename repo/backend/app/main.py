from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import cases

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="火灾调查复盘时序复原系统 API",
    description="面向火灾调查复盘会议的全栈应用API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)


@app.get("/")
def root():
    return {
        "message": "火灾调查复盘时序复原系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
