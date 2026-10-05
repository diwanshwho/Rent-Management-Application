# Rent Manager - PG Rent Management App

A simple, clean rent management web app for PG (Paying Guest) accommodations.

## Features
- 📋 Tenant management (add, edit, remove)
- 💰 Rent tracking & payment recording
- 📱 SMS reminders to tenants (Twilio)
- 📊 Dashboard with rent status overview
- ⚡ Optional electricity bill management

## Tech Stack
- **Backend**: FastAPI (Python) + SQLite
- **Frontend**: HTML + Tailwind CSS + Vanilla JS

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
Open `frontend/index.html` in browser, or serve with:
```bash
cd frontend
python -m http.server 3000
```

### Default Login
- Email: `admin@rentmanager.com`
- Password: `admin123`

(Change these in `.env` before deploying)

## Environment Variables
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```
