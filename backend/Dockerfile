# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app

# install deps first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# copy the rest, including .sequelizerc, config/, migrations/, models/
COPY . .

EXPOSE 4001
CMD ["node","server.js"]
