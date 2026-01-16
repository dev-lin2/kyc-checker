# Build React app
FROM node:20-alpine AS build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Nginx to serve static and proxy /api to backend
FROM nginx:alpine AS runtime
COPY --from=build /web/dist/ /usr/share/nginx/html/
COPY ./deploy/nginx.web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]

