# HFME 2.0 - Quick Start Guide

Get HFME 2.0 running in 5 minutes!

## Prerequisites Check

Make sure you have:
- ✅ Node.js 20+ (`node --version`)
- ✅ Python 3.11+ (`python --version`)
- ✅ PostgreSQL 16+ running
- ✅ Redis running

## Fast Setup (Local Development)

### Step 1: Install Dependencies (2 min)

```powershell
# Main app dependencies
npm install

# Python AI service dependencies
cd ai-service
pip install -r requirements.txt
cd ..
```

### Step 2: Database Setup (1 min)

The `.env` file is already configured for localhost. Just run:

```powershell
# Generate Prisma client
npm run db:generate

# Create database schema
npm run db:push

# Load demo data (3 workflows, 320 sessions)
npm run db:seed
```

### Step 3: Start Services (2 min)

Open **THREE PowerShell terminals**:

**Terminal 1 - Database & Redis (Docker)**
```powershell
# Use Docker for easy database setup
docker run -d --name hfme-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d --name hfme-redis -p 6379:6379 redis:7-alpine
```

**Terminal 2 - AI Service**
```powershell
cd ai-service
python -m uvicorn main:app --reload --port 8000
```

**Terminal 3 - Web App**
```powershell
npm run dev
```

## Access the Application

🌐 **Web Dashboard**: http://localhost:3000  
🤖 **AI API Docs**: http://localhost:8000/docs  

### Default Login
```
Email: admin@hfme.io
Password: hfme_admin_2024
```

---

## What You'll See

### Dashboard (http://localhost:3000)
- Overall friction index
- AI anomaly alerts
- Workflow cards with friction levels
- High friction step highlights

### Demo Workflows

1. **E-commerce Checkout** - Stable, low friction (green)
2. **SaaS Onboarding** - Rising friction trend (amber → red)
3. **Document Upload** - Sudden anomaly spike (red alert)

### Try the AI Features

1. Click any workflow to see detailed metrics
2. Look for **purple AI insight boxes** on high-friction steps
3. Visit the Admin page to see AI monitoring config

---

## Quick Commands

```powershell
# View database in browser
npm run db:studio

# Reset and reload data
npm run db:push -- --force-reset
npm run db:seed

# Check AI service health
curl http://localhost:8000/health

# Test metrics calculation
curl http://localhost:3000/api/workflows
```

---

## Troubleshooting

**Port 5432 already in use?**
```powershell
# Find and stop conflicting process
netstat -ano | findstr :5432
# Or use a different port in .env
```

**AI service won't start?**
```powershell
# Check Python version
python --version  # Should be 3.11+

# Install in virtual environment
python -m venv venv
.\venv\Scripts\Activate
pip install -r ai-service/requirements.txt
```

**Database connection failed?**
```powershell
# Check PostgreSQL is running
docker ps | findstr postgres

# Test connection
psql postgresql://postgres:postgres@localhost:5432/hfme
```

---

## Next Steps

- 📖 Read the full [README.md](README.md) for architecture details
- 🔧 Customize workflows in the database
- 🤖 Train AI models with your own data
- 🚀 Deploy to Vercel + Railway + Supabase

---

## Getting Help

- Check the [README.md](README.md) troubleshooting section
- Review API documentation at http://localhost:8000/docs
- Inspect logs in terminal windows

---

**You're all set! 🎉 Explore the friction analytics dashboard and AI insights.**
