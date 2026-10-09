from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from database import get_db
from models import User, Tenant

security_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT and return the logged-in user (admin or tenant)."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        tenant_id: int = payload.get("tenant_id")

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user

        if tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if tenant is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tenant not found")
            user = User(id=tenant_id, email=f"tenant-{tenant_id}", name=tenant.name, hashed_password="")
            return user

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
