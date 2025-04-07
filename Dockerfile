FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 py3-pip make g++ bash py3-setuptools
RUN npm install
COPY . .
RUN npm run build-server
RUN npm run build-website

ENTRYPOINT npm run server -- --port 13405
