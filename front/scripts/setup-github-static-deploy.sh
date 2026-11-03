#!/usr/bin/env bash
# À lancer UNE fois, à la main : autorise GitHub Actions à publier le site
# statique (job « Deploy (S3 + CloudFront) »), sans aucune clé AWS dans GitHub.
#
#   cd front && bash scripts/setup-github-static-deploy.sh
#
# Rôle pokewish-github-deploy (créé si absent), que SEUL le dépôt
# MaxenceRault/pokewish sur la branche main peut prendre (OIDC), avec pour
# seuls droits : écrire dans le bucket du site et vider le cache CloudFront.
set -euo pipefail

ROLE="pokewish-github-deploy"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="pokewish-static-$ACCOUNT"
DIST_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E1G23D8DCWMLIO}"
PROVIDER="token.actions.githubusercontent.com"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1. GitHub comme fournisseur d'identité (OIDC)
if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn \
  "arn:aws:iam::$ACCOUNT:oidc-provider/$PROVIDER" >/dev/null 2>&1; then
  aws iam create-open-id-connect-provider --url "https://$PROVIDER" \
    --client-id-list sts.amazonaws.com >/dev/null
fi
echo "✓ fournisseur OIDC GitHub"

# 2. Qui peut prendre le rôle : ce dépôt, branche main (les deux formats
#    d'identité de GitHub, dont celui avec les identifiants permanents)
cat > "$TMP/trust.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::$ACCOUNT:oidc-provider/$PROVIDER" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "$PROVIDER:aud": "sts.amazonaws.com",
        "$PROVIDER:sub": [
          "repo:MaxenceRault@148987884/pokewish@1442792526:ref:refs/heads/main",
          "repo:MaxenceRault/pokewish:ref:refs/heads/main"
        ]
      }
    }
  }]
}
JSON
if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" \
    --policy-document "file://$TMP/trust.json"
else
  aws iam create-role --role-name "$ROLE" \
    --description "GitHub Actions (MaxenceRault/pokewish, main) : publie le site statique" \
    --assume-role-policy-document "file://$TMP/trust.json" >/dev/null
fi
echo "✓ rôle $ROLE (dépôt MaxenceRault/pokewish, branche main)"

# 3. Ce que le rôle peut faire : le bucket du site et son cache, rien d'autre
cat > "$TMP/policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListerLeBucketDuSite",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::$BUCKET"
    },
    {
      "Sid": "EcrireLesFichiersDuSite",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::$BUCKET/*"
    },
    {
      "Sid": "ViderLeCacheDuCDN",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID"
    }
  ]
}
JSON
aws iam put-role-policy --role-name "$ROLE" --policy-name deploy-static-site \
  --policy-document "file://$TMP/policy.json"
# Ancienne permission (déploiement de la Lambda par la CI), plus utilisée
aws iam delete-role-policy --role-name "$ROLE" \
  --policy-name deploy-lambda-code 2>/dev/null || true
echo "✓ droits : écrire dans $BUCKET + invalider $DIST_ID, rien d'autre"
