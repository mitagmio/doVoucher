# build stage
FROM node:16-alpine as build-stage
ENV NODE_OPTIONS=--max_old_space_size=8000
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./

RUN yarn install
COPY . .
RUN yarn build

# production stage
FROM nginx:stable-alpine as production-stage
COPY .nginx/nginx.conf /temp/prod.conf
RUN envsubst /app < /temp/prod.conf > /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
