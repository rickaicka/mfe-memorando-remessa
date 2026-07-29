FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build \
    && test -f /app/dist/daruix-mfe-remessas/remoteEntry.json


FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/daruix-mfe-remessas/ /usr/share/nginx/html/

EXPOSE 80
