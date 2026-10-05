# Deploying Rent Manager on Koyeb (Free Tier)

## Prerequisites
- A GitHub account (to host your code)
- A Koyeb account (sign up at https://app.koyeb.com — free, no credit card)
- A Neon account (sign up at https://neon.tech — free PostgreSQL database)

---

## Step 1: Set Up the Database (Neon PostgreSQL)

1. Go to https://console.neon.tech and sign up (use GitHub login for speed)
2. Click **"Create a project"**
   - Name: `rent-manager`
   - Region: Pick the closest to your users (e.g., Singapore for India)
   - Click **Create**
3. On the dashboard, you'll see a **Connection string** like:
   ```
   postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copy this connection string** — you'll need it in Step 3

---

## Step 2: Push Code to GitHub

1. Go to https://github.com/new and create a new repository
   - Name: `rent-manager`
   - Keep it **Private** (it has your app code)
   - Don't add README (we already have one)
   - Click **Create repository**

2. Open a terminal in the `rent-manager` folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Rent Manager app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rent-manager.git
   git push -u origin main
   ```

---

## Step 3: Deploy on Koyeb

1. Go to https://app.koyeb.com and sign up (use GitHub login)

2. Click **"Create Web Service"** → Choose **GitHub**

3. Connect your GitHub account if not already connected

4. Select your **rent-manager** repository

5. Configure the service:
   - **Name**: `rent-manager`
   - **Region**: Pick closest to your users
   - **Instance type**: Free (Nano)
   - **Build command**: `pip install -r requirements.txt`
   - **Run command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Port**: `8000`

6. **Add Environment Variables** (click "Add Variable" for each):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste your Neon connection string from Step 1) |
   | `SECRET_KEY` | (make a random string — go to https://randomkeygen.com and copy a 256-bit key) |
   | `ADMIN_EMAIL` | your-email@example.com |
   | `ADMIN_PASSWORD` | (pick a strong password) |
   | `CORS_ORIGINS` | * |
   | `TWILIO_ACCOUNT_SID` | (leave empty or add later) |
   | `TWILIO_AUTH_TOKEN` | (leave empty or add later) |
   | `TWILIO_PHONE_NUMBER` | (leave empty or add later) |

7. Click **Deploy**

8. Wait 2-3 minutes. Once deployed, you'll get a URL like:
   ```
   https://rent-manager-YOUR_ID.koyeb.app
   ```

9. Open that URL — you should see the login page!

---

## Step 4: First Login

1. Open your Koyeb URL in the browser
2. Log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in Step 3
3. Start adding tenants and managing rent!

---

## Updating the App

Whenever you push changes to GitHub, Koyeb auto-deploys:

```bash
git add .
git commit -m "your changes"
git push
```

Koyeb picks up the push and redeploys automatically. Takes about 1-2 minutes.

---

## Setting Up SMS (Optional)

1. Sign up at https://www.twilio.com/try-twilio (free trial, ~$15 credit)
2. Get your Account SID, Auth Token, and a phone number from the Twilio console
3. Go to Koyeb dashboard → your service → Settings → Environment Variables
4. Update `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
5. Koyeb will auto-redeploy

**Note**: Twilio free trial requires verifying each recipient phone number.
For production SMS in India, consider upgrading Twilio or using MSG91/Textlocal.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App won't start | Check Koyeb logs (Dashboard → your service → Logs) |
| Database errors | Verify `DATABASE_URL` is correct in env vars |
| Login doesn't work | Check `ADMIN_EMAIL` and `ADMIN_PASSWORD` in env vars |
| CSS/JS not loading | Make sure `frontend/` folder is committed to GitHub |
| SMS not sending | Check Twilio credentials; app logs SMS when not configured |

---

## Accessing from Phone

Just open the Koyeb URL in your phone's browser. It works like an app!

To add it to your home screen:
- **Android Chrome**: Menu (3 dots) → "Add to Home Screen"
- **iPhone Safari**: Share button → "Add to Home Screen"

This gives you an app icon that opens full-screen — feels like a native app.

---

## Cost Summary

| Service | Cost |
|---------|------|
| Koyeb (backend + frontend) | Free |
| Neon (PostgreSQL database) | Free (0.5 GB) |
| Twilio (SMS) | Free trial ($15 credit) |
| **Total** | **$0** |
