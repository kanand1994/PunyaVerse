# ==========================================================
#                  STAGE 1: BUILD FRONTEND
# ==========================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package and lock files
COPY frontend/package.json ./

# Install dependencies using legacy-peer-deps to avoid conflict between React 19 and older packages
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./

# Build production assets (will be outputted to /app/frontend/build)
RUN npm run build

# ==========================================================
#                  STAGE 2: RUNTIME SERVER
# ==========================================================
FROM ubuntu:22.04 AS runner

# Prevent interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1

WORKDIR /app

# Install base packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Add official MongoDB 7.0 GPG key and Repository
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && \
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB, Nginx, Python 3, Pip, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    mongodb-org \
    nginx \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libjq-dev \
    && rm -rf /var/lib/apt/lists/*

# Ensure Nginx user exists and belongs to correct groups
RUN id -u nginx >/dev/null 2>&1 || useradd -r -g www-data -s /bin/false nginx

# Copy backend requirements and install
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip3 install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code (including mock packages)
COPY backend/ /app/backend/

# Copy React built assets from Stage 1 to Nginx default folder
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Copy Nginx server configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup orchestration script
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose single port 80 for public access (Nginx acts as reverse proxy)
EXPOSE 80

# Run entrypoint script which launches MongoDB, FastAPI, and Nginx
ENTRYPOINT ["/app/entrypoint.sh"]
