# ── Stage 1 : Build frontend ─────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ENV VITE_API_URL=/api/v1
ENV VITE_SOCKET_URL=""
RUN npm run build

# ── Stage 2 : Backend + frontend dist ────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npx prisma generate

# Copier le build frontend dans public/
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 3001
CMD ["npm", "start"]
