FROM node:22-alpine AS build

WORKDIR /usr/src/app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SAAS_ENABLED=false
ENV VITE_SAAS_ENABLED=$VITE_SAAS_ENABLED

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ARG NGINX_CONFIG=nginx.conf

RUN rm -f /etc/nginx/conf.d/default.conf
COPY ${NGINX_CONFIG} /etc/nginx/conf.d/default.conf
RUN nginx -t
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
