FROM node:alpine

WORKDIR '/app'

# Copy package files first to install dependencies in Linux environment
COPY package*.json ./
RUN npm install --force

# Copy source code
COPY . .

# Copy and set up entrypoint script
COPY ./scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables BEFORE building
# ENV VITE_NAME=frontend-dev
# ENV VITE_API_URL=http://localhost:5000
ENV VITE_SERVER_URL=https://aicv.wittysea-f7fdfd12.eastus.azurecontainerapps.io

# Debug: Check environment variable is set
RUN echo "VITE_SERVER_URL is set to: $VITE_SERVER_URL"

# Build the application in Linux environment
RUN npm run build

ENTRYPOINT ["/entrypoint.sh"]
CMD [ "npm", "run", "preview" ]