FROM node:22-bookworm-slim

WORKDIR /app/backend

# instalar las dependencias
COPY backend/package*.json ./

RUN npm ci

# copiar el codigo del backend
COPY backend/ ./

# puerto de la API
EXPOSE 3000

# iniciar el servidor
CMD ["npm", "start"]