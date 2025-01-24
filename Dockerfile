# # Base image
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Copy package.json and package-lock.json
# COPY package*.json ./

# # Install dependencies
# RUN npm install --production

# # Copy application code
# COPY . .

# # Expose the port your app runs on
# EXPOSE 8080

# # Define the command to start the app
# CMD ["node", "index.js"]





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

# Expose the port your app runs on (adjust if your app uses a different port)
EXPOSE 8080

# Define the command to start the app
CMD ["node", "index.js"]
