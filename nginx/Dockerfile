# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Nginx with built frontend
FROM nginx:alpine
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
# Copia como template — envsubst substitui ${API_PORT} na inicialização
COPY nginx/nginx.conf /etc/nginx/nginx.conf.template
EXPOSE 80
# Substitui variáveis de ambiente no template antes de iniciar o nginx
CMD ["/bin/sh", "-c", "envsubst '${API_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
