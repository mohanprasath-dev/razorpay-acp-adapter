# Deployment Guide — Razorpay ACP Adapter

This document details the production and staging deployment processes for the **Razorpay ACP Adapter** stack:
- **Backend**: FastAPI on Google Cloud Run (Containerized)
- **Frontend**: Next.js 14 on Vercel
- **Database**: Google Cloud Firestore (Native Mode)
- **Payment Gateway**: Razorpay (Test / Live Mode)

---

## 1. Backend Deployment (Google Cloud Run)

The backend is packaged using the root [`Dockerfile`](../Dockerfile) with multi-architecture Python 3.11-slim runtime.

### Prerequisites
- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk) installed and authenticated (`gcloud auth login`)
- Target GCP project configured (`gcloud config set project YOUR_PROJECT_ID`)
- Artifact Registry or Google Container Registry API enabled

### Deploy with Google Cloud CLI

```bash
# 1. Build and submit container image via Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/razorpay-acp-adapter:latest .

# 2. Deploy to Cloud Run
gcloud run deploy razorpay-acp-adapter \
  --image gcr.io/YOUR_PROJECT_ID/razorpay-acp-adapter:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,FIRESTORE_PROJECT_ID=YOUR_PROJECT_ID,RAZORPAY_KEY_ID=rzp_test_xxxx,RAZORPAY_KEY_SECRET=yyyy,ACP_SPEC_VERSION=2026-04-17
```

### Verification
```bash
# Check health
curl https://razorpay-acp-adapter-<hash>-el.a.run.app/health
# Response: {"status": "ok"}

# Check capability discovery feed
curl https://razorpay-acp-adapter-<hash>-el.a.run.app/.well-known/agent.json
```

---

## 2. Frontend Deployment (Vercel)

The frontend is a Next.js 14 App Router dashboard located in the [`frontend/`](../frontend) directory.

### Deploy with Vercel CLI

```bash
cd frontend

# Deploy preview or production
vercel --prod
```

### Environment Variables on Vercel
Set the following environment variable in your Vercel Project Settings:
- `NEXT_PUBLIC_BACKEND_URL`: `https://razorpay-acp-adapter-<hash>-el.a.run.app` (Your deployed Cloud Run backend URL)

---

## 3. Local Docker Testing

To test the containerized backend locally with Docker:

```bash
# Build image
docker build -t razorpay-acp-adapter .

# Run container
docker run -p 8000:8000 \
  -e ENVIRONMENT=development \
  -e RAZORPAY_KEY_ID=rzp_test_dummy \
  -e RAZORPAY_KEY_SECRET=dummy_secret \
  razorpay-acp-adapter
```
