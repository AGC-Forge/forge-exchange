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
    echo "LETSENCRYPT_EMAIL empty; skipping Let's Encrypt for ${DOMAIN}" >&2
    return
  fi
  echo "Requesting Let's Encrypt cert for ${DOMAIN}..." >&2
  certbot certonly --webroot -w /var/www/certbot \
    --email "${LETSENCRYPT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "${DOMAIN}" || true
  if link_letsencrypt; then
    echo "Let's Encrypt cert linked for ${DOMAIN}" >&2
  else
    echo "Let's Encrypt cert not available for ${DOMAIN}; using self-signed" >&2
  fi
}

ensure_self_signed "${DOMAIN:-localhost}"

if [ -z "${PGADMIN_HTTP_USER}" ] || [ -z "${PGADMIN_HTTP_PASSWORD}" ]; then
  echo "Missing PGADMIN_HTTP_USER/PGADMIN_HTTP_PASSWORD env for /pgadmin basic auth" >&2
  exit 1
fi
openssl passwd -apr1 "${PGADMIN_HTTP_PASSWORD}" | awk -v u="${PGADMIN_HTTP_USER}" '{print u ":" $0}' > /etc/nginx/pgadmin.htpasswd

normalized_pgadmin_allowed_ips="$(echo "${PGADMIN_ALLOWED_IPS}" | tr -d '[:space:]')"
: > /etc/nginx/pgadmin-allow.conf
if [ -n "${normalized_pgadmin_allowed_ips}" ]; then
  allowed_count=0
  echo "${PGADMIN_ALLOWED_IPS}" | tr ',' '\n' | while IFS= read -r ip; do
    ip="$(echo "${ip}" | xargs)"
    if [ -n "${ip}" ]; then
      echo "allow ${ip};" >> /etc/nginx/pgadmin-allow.conf
      allowed_count=$((allowed_count + 1))
    fi
  done
  if [ "$(wc -l < /etc/nginx/pgadmin-allow.conf | xargs)" -gt 0 ]; then
    echo "deny all;" >> /etc/nginx/pgadmin-allow.conf
  fi
fi

if [ -n "${DOMAIN}" ] && [ "${DOMAIN}" != "localhost" ] && [ -n "${LETSENCRYPT_EMAIL}" ]; then
  (
    sleep 2
    obtain_cert_if_needed
    nginx -s reload || true
    while :; do
      certbot renew --webroot -w /var/www/certbot --quiet || true
      link_letsencrypt || true
      nginx -s reload || true
      sleep 12h
    done
  ) &
fi

exec nginx -g 'daemon off;'
