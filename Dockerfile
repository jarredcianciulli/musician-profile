FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG REACT_APP_CONTACT_ENDPOINT=https://api.batterystringstudio.com/contact
ARG REACT_APP_STUDIO_API=https://api.batterystringstudio.com
ARG REACT_APP_WEBSITE_DOMAIN=https://batterystringstudio.com
ARG REACT_APP_LAB_URL=https://lab.batterystringstudio.com
ARG REACT_APP_METHOD_URL=https://method.batterystringstudio.com
ARG REACT_APP_STUDIO_EMAIL=hello@batterystringstudio.com
ENV REACT_APP_CONTACT_ENDPOINT=$REACT_APP_CONTACT_ENDPOINT \
    REACT_APP_STUDIO_API=$REACT_APP_STUDIO_API \
    REACT_APP_WEBSITE_DOMAIN=$REACT_APP_WEBSITE_DOMAIN \
    REACT_APP_LAB_URL=$REACT_APP_LAB_URL \
    REACT_APP_METHOD_URL=$REACT_APP_METHOD_URL \
    REACT_APP_STUDIO_EMAIL=$REACT_APP_STUDIO_EMAIL

RUN npm run build

FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
