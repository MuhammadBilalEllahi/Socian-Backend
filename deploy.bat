@echo off
echo 🚀 Building and deploying Socian Backend with PM2...

REM Build the Docker image
echo 📦 Building Docker image...
docker build -t socian-backend .

REM Stop and remove existing container if it exists
echo 🛑 Stopping existing container...
docker stop socian-backend 2>nul
docker rm socian-backend 2>nul

REM Run the new container
echo ▶️ Starting new container...
docker run -d ^
  --name socian-backend ^
  -p 8080:8080 ^
  -e NODE_ENV=production ^
  -e PORT=8080 ^
  -e INSTANCES=4 ^
  -v %cd%/logs:/app/logs ^
  --restart unless-stopped ^
  socian-backend

echo ✅ Deployment complete!
echo 📊 Container status:
docker ps | findstr socian-backend

echo 📝 Logs:
docker logs socian-backend

echo 🔗 Access your app at: http://localhost:8080
pause 