#!/usr/bin/env bash
# Publie le site statique (npm run generate) sur S3, puis vide le cache CloudFront.
# Utilisé par la CI (job « Deploy (S3 + CloudFront) ») et à la main :
#
#   cd front && NUXT_PUBLIC_API_BASE=https://… npm run generate
#   bash scripts/publish-static.sh
#
# Variables : S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID (valeurs par défaut :
# celles créées par scripts/setup-static-site.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET="${S3_BUCKET:-pokewish-static-805815160134}"
DIST_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E1G23D8DCWMLIO}"
# SITE_DIR : dossier généré à publier (rollback : celui d'une ancienne version)
SITE="${SITE_DIR:-.output/public}"

[ -f "$SITE/index.html" ] || { echo "Lance d'abord : npm run generate"; exit 1; }

# Fichiers versionnés (nom avec empreinte) : cache d'un an
aws s3 sync "$SITE/_nuxt" "s3://$BUCKET/_nuxt" --delete \
  --cache-control "public,max-age=31536000,immutable"

# Pages et données : toujours revalidées
aws s3 sync "$SITE" "s3://$BUCKET" --delete --exclude "_nuxt/*" \
  --cache-control "public,max-age=0,must-revalidate"

# Le CDN sert la nouvelle version partout
aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths "/*" --query Invalidation.Id --output text
