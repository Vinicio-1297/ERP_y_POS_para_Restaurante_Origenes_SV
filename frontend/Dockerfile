FROM node:22-bookworm-slim

WORKDIR /app/frontend

# instalar las dependencias
COPY frontend/package*.json ./

RUN npm ci

# copiar el codigo del frontend
COPY frontend/ ./

# puerto de vite
EXPOSE 5173

# iniciar el frontend
CMD ["npm", "run", "dev"]