# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# production (default), staging or development: each points at its own API (src/environments).
ARG BUILD_CONFIGURATION=production
RUN npx ng build --configuration "$BUILD_CONFIGURATION"

FROM nginx:1.27-alpine AS web
# A template: the image's entrypoint fills in ${API_UPSTREAM} at start-up. docker-compose's API is "api";
# in Azure the deployment sets the API container app's internal address.
ENV API_UPSTREAM=http://api:8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist/autoreach-web/browser /usr/share/nginx/html
EXPOSE 80
