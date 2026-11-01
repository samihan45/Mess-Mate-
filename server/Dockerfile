FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install --workspace server --include-workspace-root --no-audit --no-fund
COPY server server
RUN npm run db:generate -w server && npm run build -w server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/prisma server/prisma
COPY server/package.json server/
WORKDIR /app/server
EXPOSE 4000
# Apply migrations, then start. Seed manually if you want sample data.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
