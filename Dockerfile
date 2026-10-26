# syntax=docker/dockerfile:1
# Build bằng Vite rồi phục vụ tĩnh bằng nginx (không root, cổng 8080).
#   docker build --build-arg VITE_API_BASE=/api/v1 -t react-boilerplate .
# VITE_API_BASE được nhúng vào bundle lúc build (không đổi được lúc chạy); rỗng thì client dùng /api/v1.
# /api do reverse proxy phía trước chuyển tới API; container này không proxy /api.

ARG NODE_VERSION=22

# ---- Cài package (lớp cache riêng: chỉ chạy lại khi package*.json đổi) ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build (tsc -b + vite build) ----
FROM deps AS build
ARG VITE_API_BASE=
COPY . .
# Tạo .env theo mẫu .env.example (.dockerignore loại mọi .env*) để Vite nạp lúc build.
# VITE_API_BASE rỗng thì client tự dùng /api/v1 (shared/config/env.ts).
RUN printf 'VITE_API_BASE="%s"\n' "$VITE_API_BASE" > .env \
 && npm run build

# ---- Phục vụ tĩnh ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
