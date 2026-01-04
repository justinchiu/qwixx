FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build packages in order (shared must be first)
RUN npm run build:shared
RUN npm run build:server
RUN npm run build:client

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "run", "start"]
