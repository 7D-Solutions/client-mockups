#!/bin/sh

# Replace the port in nginx config with Railway's PORT env variable
# Railway provides PORT env variable, default to 8080 if not set
PORT=${PORT:-8080}

# Create nginx config from template
envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /tmp/default.conf
mv /tmp/default.conf /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'