# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This means npm install only runs if dependencies change
COPY package*.json ./
RUN npm install

# Copy the rest of your React application source code
COPY . .

# Build the React application for production
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Create necessary Nginx directories and set correct permissions for Nginx temp files and PID
# This ensures /var/run/nginx is writable for the PID file.
RUN mkdir -p /var/cache/nginx/client_temp /var/run/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run/nginx && \
    chmod -R 755 /var/cache/nginx /var/run/nginx

# Copy the built React application files to Nginx's default web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Change ownership of the web root directory to the Nginx user and group
RUN chown -R nginx:nginx /usr/share/nginx/html

# Set appropriate permissions for web root files and directories:
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \;
RUN find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# *** THIS IS THE KEY CHANGE FOR PID ERROR ***
# Copy the FULL custom nginx.conf to replace the default one in the container.
# This ensures the 'pid' directive is set correctly.
COPY nginx.frontend.full.conf /etc/nginx/nginx.conf

# Expose port 80, as Nginx inside this container will listen on it
EXPOSE 80

# Run Nginx as the 'nginx' user for security
USER nginx
CMD ["nginx", "-g", "daemon off;"]
