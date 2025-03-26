FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache curl wget

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --production
# If you're building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# Create required directories
RUN mkdir -p data/uploads data/exports && \
    chmod 755 data/uploads data/exports

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --spider -q http://localhost:3000 || exit 1

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "app.js"]