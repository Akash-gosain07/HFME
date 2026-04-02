# HFME 2.0 - Human Friction Mapping Engine

> **AI-Powered Behavioral Analytics Platform for Workflow Friction Detection**

HFME 2.0 is an enterprise-grade platform that detects, predicts, and explains human friction in multi-step workflows using advanced AI monitoring and machine learning.

---

## 🎯 Features:

### Core Analytics
- **Real-time Friction Detection** - Track step delays, retries, idle time, and drop-off rates
- **Multi-workflow Monitoring** - Manage and analyze multiple workflows simultaneously
- **Session Tracking** - Detailed event-level tracking of user behavior
- **Aggregated Metrics** - Automated calculation of friction scores and behavioral patterns

### AI-Powered Insights
- **Anomaly Detection** - Isolation Forest algorithm identifies unusual friction spikes
- **Friction Prediction** - Time-series forecasting predicts future friction trends
- **Natural Language Explanations** - LLM-based insights generate human-readable recommendations
- **Confidence Scoring** - AI provides confidence levels for all predictions and insights

### Enterprise Features
- **Live Monitoring Dashboard** - Real-time friction metrics and AI alerts
- **Friction Heatmaps** - Visual representation of workflow bottlenecks
- **AI Insights Panel** - Actionable recommendations for workflow optimization
- **Admin Controls** - Configure AI sensitivity and monitoring parameters

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HFME 2.0 Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Next.js 14 │◄──►│   FastAPI    │◄──►│  AI/ML    │ │
│  │   (Frontend) │    │  (AI Service)│    │  Models   │ │
│  │   + API      │    │              │    │           │ │
│  └───────┬──────┘    └──────────────┘    └───────────┘ │
│          │                                               │
│          │                                               │
│  ┌───────▼──────┐    ┌──────────────┐                  │
│  │  PostgreSQL  │    │    Redis     │                  │
│  │  (Prisma ORM)│    │  (Cache)     │                  │
│  └──────────────┘    └──────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend & API**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- Recharts + D3.js

**AI/ML Service**
- Python FastAPI
- scikit-learn (Isolation Forest, Ridge Regression)
- NumPy, Pandas
- Optional: OpenAI API for enhanced explanations

**Database & Cache**
- PostgreSQL with Prisma ORM
- Redis for real-time caching

**Deployment**
- Docker & Docker Compose
- Vercel-ready (Next.js)
- Railway-ready (Python service)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- **PostgreSQL** 16+
- **Redis** 7+
- **Docker** (optional, recommended)

### Option 1: Docker Setup (Recommended)

1. **Clone and configure**
   ```powershell
   cd C:\Users\win11\Desktop\HFME
   cp .env.example .env
   ```

2. **Start all services**
   ```powershell
   docker-compose up -d
   ```

3. **Initialize database**
   ```powershell
   docker-compose exec web npm run db:push
   docker-compose exec web npm run db:seed
   ```

4. **Access application**
   - Web App: http://localhost:3000
   - AI Service: http://localhost:8000/docs

### Option 2: Local Development Setup

1. **Install dependencies**
   ```powershell
   npm install
   cd ai-service
   pip install -r requirements.txt
   cd ..
   ```

2. **Configure environment**
   ```powershell
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Setup database**
   ```powershell
   npm run db:push
   npm run db:seed
   ```

4. **Start services** (3 separate terminals)
   ```powershell
   # Terminal 1: Web app
   npm run dev

   # Terminal 2: AI service
   cd ai-service
   python -m uvicorn main:app --reload --port 8000

   # Terminal 3: PostgreSQL & Redis (if not using Docker)
   # Start manually or use Docker for just these:
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
   docker run -d -p 6379:6379 redis:7-alpine
   ```

5. **Access application**
   - Web App: http://localhost:3000
   - AI Service: http://localhost:8000/docs

---

## 📊 Demo Data

The seed script generates **320 sessions** across **3 workflows**:

### Workflow 1: E-commerce Checkout (100 sessions)
- **Status**: Stable, low friction
- **Pattern**: Consistent performance, ~90% completion
- **Steps**: Cart Review → Shipping → Payment → Confirmation

### Workflow 2: SaaS Onboarding (120 sessions)
- **Status**: Rising friction trend
- **Pattern**: Friction increases over time, drop-off rising
- **Steps**: Account Creation → Email Verification → Profile Setup → Team Invitation → Integration Setup
- **AI Behavior**: Prediction model will detect upward trend

### Workflow 3: Document Upload (100 sessions)
- **Status**: Sudden anomaly spike (last 5 days)
- **Pattern**: Recent dramatic increase in retries and idle time
- **Steps**: File Selection → Upload → Validation → Metadata → Review
- **AI Behavior**: Anomaly detector will flag this workflow

---

## 🔐 Default Credentials

```
Email: admin@hfme.io
Password: hfme_admin_2024
```

---

## 📋 API Endpoints

### Next.js API Routes

**Workflows**
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/[id]` - Get workflow details
- `GET /api/workflows/[id]/metrics` - Calculate and retrieve metrics
- `POST /api/workflows` - Create new workflow

**AI Insights**
- `POST /api/ai/insights` - Generate AI insights for a workflow step

### Python AI Service

**Analysis**
- `POST /analyze/anomaly` - Detect friction anomalies
- `POST /analyze/predict` - Predict future friction
- `POST /analyze/explain` - Generate natural language explanation

**Training**
- `POST /train/anomaly` - Train anomaly detection model
- `POST /train/predictor` - Train friction prediction model

**Health**
- `GET /health` - Service health check

Full API documentation: http://localhost:8000/docs

---

## 🧪 Development Workflow

### Running Tests
```powershell
# Next.js tests
npm test

# Python tests
cd ai-service
pytest
```

### Database Management
```powershell
# View database in Prisma Studio
npm run db:studio

# Reset and reseed database
npm run db:push
npm run db:seed

# Generate Prisma client after schema changes
npm run db:generate
```

### AI Model Management
```powershell
# Train models with current data (called automatically by seed)
curl -X POST http://localhost:8000/train/anomaly -H "Content-Type: application/json" -d @training-data.json
```

---

## 🌐 Deployment

### Vercel (Next.js App)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push

```env
DATABASE_URL=<your-supabase-or-neon-db-url>
REDIS_URL=<your-upstash-redis-url>
AI_SERVICE_URL=<your-railway-ai-service-url>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Railway (AI Service)

1. Create new project on Railway
2. Deploy from GitHub or Docker
3. Add environment variables
4. Copy the service URL to Vercel env

### Supabase (PostgreSQL)

1. Create new Supabase project
2. Copy connection string to `DATABASE_URL`
3. Run migrations:
   ```powershell
   npx prisma db push --skip-generate
   ```

### Upstash (Redis)

1. Create Redis database on Upstash
2. Copy connection URL to `REDIS_URL`

---

## 🔧 Configuration

### AI Monitoring Settings

Configure in database or via Admin UI:

```typescript
{
  enabled: true,
  anomalySensitivity: 0.1,        // 0.0 - 1.0 (lower = more sensitive)
  predictionEnabled: true,
  explanationEnabled: true,
  monitoringInterval: 300,        // seconds
  alertThreshold: 0.7             // 0.0 - 1.0
}
```

### Friction Score Calculation

Weighted formula:
```
Friction Score = 
  (25% × Time Overrun) +
  (20% × Normalized Retries) +
  (20% × Normalized Idle Time) +
  (15% × Normalized Back Navigation) +
  (20% × Drop-off Rate)
```

**Friction Levels:**
- **Low** (0.0 - 0.3): Green
- **Medium** (0.3 - 0.5): Amber
- **High** (0.5 - 0.75): Red
- **Critical** (0.75+): Dark Red

---

## 📁 Project Structure

```
HFME/
├── ai-service/              # Python FastAPI microservice
│   ├── models/              # ML model implementations
│   │   ├── anomaly_detector.py
│   │   ├── friction_predictor.py
│   │   └── insight_generator.py
│   ├── trained_models/      # Serialized model files
│   ├── main.py              # FastAPI application
│   ├── requirements.txt
│   └── Dockerfile
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data generator
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── api/             # API routes
│   │   ├── workflows/       # Workflow pages
│   │   ├── admin/           # Admin pages
│   │   ├── page.tsx         # Dashboard
│   │   └── layout.tsx
│   ├── components/          # React components
│   └── lib/                 # Utilities and clients
│       ├── prisma.ts
│       ├── redis.ts
│       ├── ai-client.ts
│       └── utils.ts
├── docker-compose.yml       # Multi-service orchestration
├── Dockerfile               # Next.js container
├── package.json
└── README.md
```

---

## 🤝 Contributing

This is a demonstration project. For production use:

1. Add authentication and authorization
2. Implement proper error boundaries
3. Add comprehensive testing
4. Set up monitoring and logging
5. Implement rate limiting on AI endpoints
6. Add data retention policies

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🆘 Troubleshooting

### Database Connection Issues
```powershell
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://postgres:postgres@localhost:5432/hfme
```

### AI Service Not Responding
```powershell
# Check service logs
docker-compose logs ai-service

# Verify health
curl http://localhost:8000/health
```

### Port Already in Use
```powershell
# Windows: Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Seed Script Fails
```powershell
# Ensure database is empty
npm run db:push -- --force-reset
npm run db:seed
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [scikit-learn Documentation](https://scikit-learn.org)

---

**Built with ❤️ for better user experiences**
