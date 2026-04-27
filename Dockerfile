# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built assets from build stage
COPY --from=build /app/dist ./dist

# Copy server.js
COPY server.js ./

# Set environment variables
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
