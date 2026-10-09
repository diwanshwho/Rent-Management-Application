from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Tenant
from schemas import LoginRequest, SignupRequest, TenantLoginRequest, Token, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token}


@router.post("/signup", response_model=Token)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        name=req.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token}


@router.post("/tenant-login", response_model=Token)
def tenant_login(req: TenantLoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.phone == req.phone, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This number is not in our database. Please check your number.",
        )
    token = create_access_token({"tenant_id": tenant.id, "role": "tenant"})
    return {"access_token": token, "tenant_id": tenant.id}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
