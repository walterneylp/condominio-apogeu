FROM node:22-alpine AS build

WORKDIR /workspace

COPY app/package*.json ./app/

WORKDIR /workspace/app
RUN npm ci

WORKDIR /workspace
COPY app ./app

WORKDIR /workspace/app
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/app/dist /usr/share/nginx/html

EXPOSE 80 3000
