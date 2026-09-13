FROM node:22-alpine

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --omit=dev

# Copy application source
COPY index.js ./

# Run as non-root user
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

# Run Node directly to handle OS signals (SIGTERM/SIGINT) properly
CMD ["node", "index.js"]
