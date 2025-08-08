FROM node:alpine

WORKDIR '/app'

COPY ./scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy package files first to install dependencies in Linux environment
COPY package*.json ./
RUN npm install --force

# Copy source code
COPY . .

# Build the application in Linux environment
RUN npm run build

# ENV VITE_NAME=frontend-dev
# ENV VITE_API_URL=http://localhost:5000
ENV VITE_SERVER_URL=https://aicv.wittysea-f7fdfd12.eastus.azurecontainerapps.io

ENTRYPOINT ["/entrypoint.sh"]
CMD [ "npm", "run", "preview" ]