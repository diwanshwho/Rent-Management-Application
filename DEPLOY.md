
# Deploying Rent Manager on Render + Neon

## Prerequisites

- A GitHub account
- A Render account (https://render.com — free, sign up with GitHub)
- A Neon account (https://neon.tech — free PostgreSQL)

---

## Step 1: Set Up Database (Neon — 2 min)

1. Go to https://console.neon.tech → sign up with GitHub
2. Click **"New Project"**
   - Name: `rent-manager`
   - Region: closest to your users
3. Copy the **connection string**:
   ```
   postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

   Keep this — you'll need it in Step 3.

---

## Step 2: Push Code to GitHub (2 min)

1. Create a new repo at https://github.com/new

   - Name: `rent-manager`
   - Private
   - Don't add README
   - Click Create
2. In terminal, inside the `rent-manager` folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Rent Manager app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rent-manager.git
   git push -u origin main
   ```

---

## Step 3: Deploy on Render (5 min)

1. Go to https://dashboard.render.com → sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your `rent-manager` GitHub repository
4. Configure the service:

   | Setting           | Value                                                       |
   | ----------------- | ----------------------------------------------------------- |
   | **Name**          | `rent-manager` (this becomes your URL subdomain)            |
   | **Region**        | Pick closest to you (e.g. Oregon, Frankfurt, Singapore)     |
   | **Runtime**       | Python                                                      |
   | **Build Command** | `pip install -r requirements.txt`                           |
   | **Start Command** | `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | Free                                                        |

5. Click **"Advanced"** → **"Add Environment Variable"** and add:

   | Variable                | Value                                                                    |
   | ----------------------- | ------------------------------------------------------------------------ |
   | `DATABASE_URL`          | your Neon connection string from Step 1                                  |
   | `SECRET_KEY`            | any random string (go to https://randomkeygen.com → copy a 256-bit key) |
   | `ADMIN_EMAIL`           | your-email@example.com                                                   |
   | `ADMIN_PASSWORD`        | pick a strong password                                                   |
   | `CORS_ORIGINS`          | *                                                                        |

6. Click **"Create Web Service"**
7. Wait for the build to finish (3-5 min). Your app will be live at:

   ```
   https://rent-manager-XXXX.onrender.com
   ```

---

## Step 4: Keep It Awake (UptimeRobot — 2 min)

Render free tier spins down after 15 min of no traffic. Fix this with a free pinger:

1. Go to https://uptimerobot.com → sign up (free)
2. Click **"Add New Monitor"**
   - Type: **HTTP(s)**
   - Friendly Name: `Rent Manager`
   - URL: `https://rent-manager-XXXX.onrender.com/api/health`
   - Monitoring Interval: **5 minutes**
3. Click **"Create Monitor"**

This pings your app every 5 min so it never sleeps.

---

## Step 5: First Login

1. Open your Render URL in the browser
2. Log in with the ADMIN_EMAIL and ADMIN_PASSWORD you set
3. Add tenants, generate rents, record payments — all online!

---

## Access on Phone (Like an App)

Open the URL on your phone, then:

- **Android**: Chrome → 3-dot menu → **"Add to Home Screen"**
- **iPhone**: Safari → Share → **"Add to Home Screen"**

You'll get an app icon on your home screen that opens full-screen!

---

## Auto-Deploy on Code Changes

Every `git push` triggers auto-deploy:

```bash
git add .
git commit -m "your changes"
git push
```

Render rebuilds and redeploys in ~3 minutes.

---

## SMS Reminders — How It Works

No setup needed! When you click **"Send Reminder"** on a tenant's page, the app opens your phone's native SMS app with the tenant's number and a pre-filled message. You just hit Send.

This works on both Android and iPhone — no Twilio, no API keys, no cost.

---

## Troubleshooting

| Problem              | Fix                                                                        |
| -------------------- | -------------------------------------------------------------------------- |
| Build fails          | Check Render logs. Ensure `requirements.txt` is at project root.           |
| Database error       | Verify `DATABASE_URL` in environment. Test the Neon connection string.     |
| Can't log in         | Double-check `ADMIN_EMAIL` and `ADMIN_PASSWORD` in environment variables.  |
| Pages not loading    | Make sure `frontend/` folder is in the GitHub repo.                        |
| SMS app not opening  | Use on your phone (not desktop). Works best from "Add to Home Screen".     |
| App slow on first load | Free tier cold start (~30s). UptimeRobot keeps it warm after that.       |
| `psycopg` error      | Already fixed in code — `database.py` forces `psycopg2` driver.           |

---

## Cost: $0

| Service         | Free tier                        |
| --------------- | -------------------------------- |
| Render          | 750 hours/month (enough for 1 app always-on) |
| Neon PostgreSQL | 0.5 GB storage, 190 hours compute |
| UptimeRobot     | 50 monitors, 5-min interval      |
