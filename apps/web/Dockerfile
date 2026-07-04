FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY prisma ./prisma
RUN npm ci --workspace=@campushire/web
RUN npm run db:generate
RUN npm run build --workspace=@campushire/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
