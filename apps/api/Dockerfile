FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY prisma ./prisma
RUN npm ci --workspace=@campushire/api
RUN npm run db:generate
RUN npm run build --workspace=@campushire/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
