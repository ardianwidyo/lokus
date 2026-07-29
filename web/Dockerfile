# LOKUS web console — Cloud Run container.
#
# Vite builds a static bundle; nginx serves it. A second Cloud Run service
# rather than a bucket, so both halves of the product scale, log and deploy the
# same way (design/SCREENS.md screen 14: "Layanan: Cloud Run · 2 svc").

FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY eval/package.json ./eval/

RUN npm ci --ignore-scripts

COPY packages/core ./packages/core
COPY design ./design
COPY eval ./eval
COPY web ./web

# VITE_LOKUS_API_URL selects the HTTP session source over the seeded one. Left
# unset the console runs on seeded data, which is what the demo does today.
ARG VITE_LOKUS_API_URL=""
ENV VITE_LOKUS_API_URL=$VITE_LOKUS_API_URL

RUN npm run build --workspace @lokus/web


FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
