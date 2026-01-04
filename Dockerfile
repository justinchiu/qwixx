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

# Build all packages
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "run", "start"]
