# Deployment Guide: Frontend on Vercel + Backend on AWS (Docker)

This guide is tailored to this repository.

## Architecture
- Frontend: React/Vite app on Vercel
- Backend: FastAPI Docker container on AWS EC2 (Free Tier eligible)
- Database/search data: local files in `data/` copied into Docker image

## 1) Prerequisites
- AWS account (Free Tier or credits)
- Vercel account
- Domain name (optional but recommended)
- Installed locally:
  - AWS CLI
  - Docker
  - Git

## 2) Frontend on Vercel

### 2.1 Import project
- Push code to GitHub
- In Vercel: Add New Project -> Import your repo
- Root Directory: `Assignment_23BCE157/frontend`
- Framework preset: Vite

### 2.2 Add environment variable
In Vercel project settings -> Environment Variables:
- `VITE_API_URL` = your AWS backend URL (for example `http://<EC2_PUBLIC_IP>` initially)

After adding env var, redeploy frontend.

## 3) Backend on AWS EC2 (Docker)

This is the easiest free-tier-friendly AWS path with Docker.

### 3.1 Launch EC2
- AMI: Ubuntu 22.04 LTS
- Instance type: t2.micro (or t3.micro) free-tier eligible
- Storage: 20-30 GB
- Security group inbound:
  - SSH 22 (your IP)
  - HTTP 80 (0.0.0.0/0)
  - HTTPS 443 (0.0.0.0/0) if using SSL later

### 3.2 Connect and install Docker
Run on EC2:

sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker

### 3.3 Pull your repository
Run on EC2:

git clone <YOUR_GITHUB_REPO_URL>
cd Assignment_23BCE157/backend

### 3.4 Set environment variables
Create `.env` from example:

cp .env.example .env

Edit `.env` and set:
- GROQ_API_KEY=your_real_key

### 3.5 Build and run backend container
From `Assignment_23BCE157/backend` on EC2:

docker compose -f docker-compose.ec2.yml up -d --build

Check logs:

docker compose -f docker-compose.ec2.yml logs -f

### 3.6 Verify backend is live
In browser/open:
- `http://<EC2_PUBLIC_IP>/health`
- `http://<EC2_PUBLIC_IP>/api/stats`

## 4) Connect Vercel frontend to AWS backend
- Set `VITE_API_URL` in Vercel to:
  - `http://<EC2_PUBLIC_IP>` (initial)
  - or `https://api.yourdomain.com` (recommended after SSL)
- Redeploy frontend

## 5) Optional: Add domain + SSL for backend
Recommended production path:
- Point `api.yourdomain.com` A record to EC2 public IP
- Use Nginx + Certbot on EC2 for HTTPS
- Then update Vercel env var:
  - `VITE_API_URL=https://api.yourdomain.com`

## 6) Costs and Free Tier notes
- EC2 free tier usually covers up to 750 hours/month for one micro instance for 12 months (new accounts).
- Data transfer/storage limits still apply.
- Stop/terminate resources when not needed.

## 7) Redeploy flow (after code changes)
On EC2:

cd Assignment_23BCE157
git pull
cd backend
docker compose -f docker-compose.ec2.yml up -d --build

## 8) Troubleshooting
- If frontend shows CORS/network errors:
  - Verify backend URL in Vercel `VITE_API_URL`
  - Check EC2 security group has port 80 open
- If backend container exits:
  - `docker ps -a`
  - `docker compose -f docker-compose.ec2.yml logs`
- If API key errors appear:
  - Confirm `.env` has valid `GROQ_API_KEY`

## Files added for deployment
- `backend/Dockerfile`
- `backend/docker-compose.ec2.yml`
- `backend/.env.example`
- `.dockerignore`
