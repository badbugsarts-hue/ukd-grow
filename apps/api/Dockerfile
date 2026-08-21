FROM node:24-alpine
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY packages/contracts packages/contracts
COPY apps/api apps/api
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@ukd/api", "start"]
