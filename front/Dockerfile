FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Vite env vars (baked into bundle at build time)
# In Docker with API Gateway, all traffic goes through gateway at port 8080
ARG VITE_WS_URL=ws://localhost:8080
ARG VITE_AUTH_API_URL=http://localhost:8080
ARG VITE_MAP_API_URL=http://localhost:8080
ARG VITE_LOCOMOTIVE_API_URL=http://localhost:8080
ARG VITE_NORMALIZATION_API_URL=http://localhost:8080

RUN npm run build

# ── Production stage: serve with nginx ─────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: redirect all routes to index.html
RUN printf 'server {\n\
  listen 3000;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
