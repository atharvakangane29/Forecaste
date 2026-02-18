from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import models
from AuthData import SessionLocal, engine
import auth

# Create Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Mount frontend directories so CSS/JS can load
app.mount("/assets", StaticFiles(directory="../frontend/assets"), name="assets")
app.mount("/data", StaticFiles(directory="../frontend/data"), name="data")
app.mount("/src", StaticFiles(directory="../frontend/src"), name="src")

# Setup templates directory
templates = Jinja2Templates(directory="../frontend")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    class Config:
        orm_mode = True

# --- API Endpoints ---

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "username": new_user.username}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "message": "Login successful", 
        "username": db_user.username,
        "role": db_user.role
    }

@app.get("/users", response_model=list[UserOut])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# --- DASHBOARD ROUTE (JINJA2) ---
# This serves your HTML and injects the variables
@app.get("/", response_class=HTMLResponse)
async def serve_dashboard(request: Request, username: str = "Guest", role: str = "Viewer"):
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "username": username,
        "role": role
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)