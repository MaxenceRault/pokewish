#!/usr/bin/env bash
# Crée (une fois) l'hébergement statique du front : S3 privé + CloudFront.
# Rejouable : ce qui existe déjà est réutilisé.
#
#   cd front && bash scripts/setup-static-site.sh
#
# - bucket S3 privé (eu-north-1), lisible uniquement par CloudFront (OAC)
# - CloudFront Function : /pokemon/pikachu -> /pokemon/pikachu/index.html
# - distribution CloudFront (HTTPS), repli sur /200.html pour les pages non
#   générées (autres langues, liens par numéro) : rendues dans le navigateur
set -euo pipefail

REGION="eu-north-1"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="pokewish-static-$ACCOUNT"
NAME="pokewish-static"
FUNCTION="pokewish-index-rewrite"
cf() { aws cloudfront --output text "$@"; }
step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

step "Bucket S3 $BUCKET"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "existe déjà"
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
  echo "créé"
fi
# Jamais public : seul CloudFront y accède
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

step "Accès CloudFront -> S3 (Origin Access Control)"
OAC_ID=$(cf list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$NAME'].Id | [0]")
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$(cf create-origin-access-control --query OriginAccessControl.Id \
    --origin-access-control-config \
    "Name=$NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3")
  echo "créé : $OAC_ID"
else
  echo "existe déjà : $OAC_ID"
fi

step "CloudFront Function $FUNCTION"
cat > "$TMP/rewrite.js" <<'JS'
// /pokemon/pikachu -> /pokemon/pikachu/index.html (S3 ne le fait pas seul)
function handler(event) {
  var request = event.request
  var uri = request.uri
  if (uri.endsWith('/')) {
    request.uri += 'index.html'
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    request.uri += '/index.html'
  }
  return request
}
JS
CONFIG="Comment=PokeWish index.html,Runtime=cloudfront-js-2.0"
if ETAG=$(cf describe-function --name "$FUNCTION" --query ETag 2>/dev/null); then
  ETAG=$(cf update-function --name "$FUNCTION" --if-match "$ETAG" \
    --function-config "$CONFIG" --function-code "fileb://$TMP/rewrite.js" \
    --query ETag)
  echo "mise à jour"
else
  ETAG=$(cf create-function --name "$FUNCTION" --function-config "$CONFIG" \
    --function-code "fileb://$TMP/rewrite.js" --query ETag)
  echo "créée"
fi
cf publish-function --name "$FUNCTION" --if-match "$ETAG" >/dev/null
FUNCTION_ARN=$(cf describe-function --name "$FUNCTION" --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN)

step "Distribution CloudFront"
DIST_ID=$(cf list-distributions \
  --query "DistributionList.Items[?Comment=='$NAME'].Id | [0]")
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  ORIGIN="$BUCKET.s3.$REGION.amazonaws.com"
  cat > "$TMP/dist.json" <<JSON
{
  "CallerReference": "$NAME-$(date +%s)",
  "Comment": "$NAME",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "s3", "DomainName": "$ORIGIN",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": { "Quantity": 1, "Items": [{
      "EventType": "viewer-request", "FunctionARN": "$FUNCTION_ARN"
    }]}
  },
  "CustomErrorResponses": { "Quantity": 2, "Items": [
    { "ErrorCode": 403, "ResponsePagePath": "/200.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 },
    { "ErrorCode": 404, "ResponsePagePath": "/200.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 }
  ]}
}
JSON
  DIST_ID=$(cf create-distribution --distribution-config "file://$TMP/dist.json" \
    --query Distribution.Id)
  echo "créée : $DIST_ID (déploiement mondial : ~5 min)"
else
  echo "existe déjà : $DIST_ID"
fi
DIST_ARN="arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID"
DOMAIN=$(cf get-distribution --id "$DIST_ID" --query Distribution.DomainName)

step "Autorisation de lecture du bucket par cette distribution"
cat > "$TMP/policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "CloudFrontLitLeSite",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "$DIST_ARN" } }
  }]
}
JSON
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$TMP/policy.json"
echo "OK"

printf '\n\033[1mBucket       : %s\nDistribution : %s\nSite         : https://%s\033[0m\n' \
  "$BUCKET" "$DIST_ID" "$DOMAIN"
