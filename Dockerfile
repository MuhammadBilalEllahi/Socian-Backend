# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (pnpm's lock file) to the container
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Create logs directory for PM2
RUN mkdir -p logs

# Expose the port your app runs on (adjust if your app uses a different port)
EXPOSE 8080

# Define the command to start the app with PM2 (no daemon for Docker)
CMD ["pnpm", "run", "pm2:start:docker"]
