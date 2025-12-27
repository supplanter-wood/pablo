FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared and server
RUN pnpm --filter @pablo/shared build
RUN pnpm --filter @pablo/server build

EXPOSE 2567

CMD ["pnpm", "--filter", "@pablo/server", "start"]

