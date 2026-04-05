#!/bin/sh

DOMAIN=${DOMAIN:-kiosk.astanait.edu.kz}

# Substitute domain placeholder in configs
sed -i "s/\${DOMAIN}/$DOMAIN/g" /etc/nginx/conf.d/default.conf
sed -i "s/\${DOMAIN}/$DOMAIN/g" /etc/nginx/ssl.conf.template

# If SSL certificate exists, enable HTTPS config
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp /etc/nginx/ssl.conf.template /etc/nginx/conf.d/ssl.conf
    echo "SSL certificate found for $DOMAIN — HTTPS enabled"
    # NOTE: port 80 keeps /ws and /api proxies (default.conf) — browsers
    # cannot follow HTTP→HTTPS redirects on WebSocket upgrade requests.
    # Only non-WS, non-API traffic gets redirected via ssl.conf if desired.
else
    echo "SSL certificate not found for $DOMAIN — running HTTP only"
fi

exec nginx -g 'daemon off;'
