#!/bin/sh
set -e

DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
PGADMIN_HTTP_USER="${PGADMIN_HTTP_USER:-}"
PGADMIN_HTTP_PASSWORD="${PGADMIN_HTTP_PASSWORD:-}"
PGADMIN_ALLOWED_IPS="${PGADMIN_ALLOWED_IPS:-}"

mkdir -p /var/www/certbot /etc/nginx/ssl /etc/nginx/conf.d

envsubst '$$DOMAIN' < /etc/nginx/templates/trafficx.conf.template > /etc/nginx/conf.d/trafficx.conf

ensure_self_signed() {
  CN="${1:-localhost}"
  CERT="/etc/nginx/ssl/fullchain.pem"
  KEY="/etc/nginx/ssl/privkey.pem"
  if [ -f "${CERT}" ] && [ -f "${KEY}" ]; then
    return
  fi
  openssl req -x509 -nodes -days 7 -newkey rsa:2048 \
    -keyout "${KEY}" \
    -out "${CERT}" \
    -subj "/CN=${CN}" >/dev/null 2>&1
}

link_letsencrypt() {
  live="/etc/letsencrypt/live/${DOMAIN}"
  if [ -f "${live}/fullchain.pem" ] && [ -f "${live}/privkey.pem" ]; then
    ln -sf "${live}/fullchain.pem" /etc/nginx/ssl/fullchain.pem
    ln -sf "${live}/privkey.pem" /etc/nginx/ssl/privkey.pem
    return 0
  fi
  return 1
}

obtain_cert_if_needed() {
  if [ -z "${DOMAIN}" ] || [ "${DOMAIN}" = "localhost" ]; then
    return
  fi
  if link_letsencrypt; then
    return
  fi
  if [ -z "${LETSENCRYPT_EMAIL}" ]; then
    return
  fi
  certbot certonly --webroot -w /var/www/certbot \
    --email "${LETSENCRYPT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "${DOMAIN}" >/dev/null 2>&1 || true
  link_letsencrypt || true
}

ensure_self_signed "${DOMAIN:-localhost}"

if [ -z "${PGADMIN_HTTP_USER}" ] || [ -z "${PGADMIN_HTTP_PASSWORD}" ]; then
  echo "Missing PGADMIN_HTTP_USER/PGADMIN_HTTP_PASSWORD env for /pgadmin basic auth" >&2
  exit 1
fi
openssl passwd -apr1 "${PGADMIN_HTTP_PASSWORD}" | awk -v u="${PGADMIN_HTTP_USER}" '{print u ":" $0}' > /etc/nginx/pgadmin.htpasswd

if [ -n "${PGADMIN_ALLOWED_IPS}" ]; then
  : > /etc/nginx/pgadmin-allow.conf
  echo "${PGADMIN_ALLOWED_IPS}" | tr ',' '\n' | while IFS= read -r ip; do
    ip="$(echo "${ip}" | xargs)"
    [ -n "${ip}" ] && echo "allow ${ip};" >> /etc/nginx/pgadmin-allow.conf
  done
  echo "deny all;" >> /etc/nginx/pgadmin-allow.conf
else
  : > /etc/nginx/pgadmin-allow.conf
fi

nginx

if [ -n "${DOMAIN}" ] && [ "${DOMAIN}" != "localhost" ] && [ -n "${LETSENCRYPT_EMAIL}" ]; then
  obtain_cert_if_needed
  nginx -s reload || true
  while :; do
    certbot renew --webroot -w /var/www/certbot --quiet || true
    link_letsencrypt || true
    nginx -s reload || true
    sleep 12h
  done
else
  tail -f /var/log/nginx/access.log /var/log/nginx/error.log
fi
