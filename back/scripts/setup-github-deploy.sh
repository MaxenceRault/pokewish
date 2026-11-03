#!/usr/bin/env bash
# À lancer UNE fois, à la main : autorise GitHub Actions à déployer la Lambda.
#
#   cd back && bash scripts/setup-github-deploy.sh
#
# Crée (si absents) :
#   1. le fournisseur d'identité OIDC de GitHub dans IAM : GitHub prouve son
#      identité à AWS, sans aucune clé AWS stockée dans GitHub ;
#   2. le rôle pokewish-github-deploy, que SEUL le dépôt MaxenceRault/pokewish
#      sur la branche main peut prendre (aws/github-deploy-trust.json) ;
#   3. sa permission : mettre à jour le code de la Lambda pokewish-api, rien
#      d'autre (aws/github-deploy-policy.json).
set -euo pipefail
cd "$(dirname "$0")/.."

ROLE="pokewish-github-deploy"
PROVIDER_URL="token.actions.githubusercontent.com"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
PROVIDER_ARN="arn:aws:iam::$ACCOUNT:oidc-provider/$PROVIDER_URL"

echo "Compte AWS : $ACCOUNT"

if aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "$PROVIDER_ARN" >/dev/null 2>&1; then
  echo "✓ fournisseur OIDC GitHub : existe déjà"
else
  aws iam create-open-id-connect-provider --url "https://$PROVIDER_URL" \
    --client-id-list sts.amazonaws.com >/dev/null
  echo "✓ fournisseur OIDC GitHub : créé"
fi

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" \
    --policy-document file://aws/github-deploy-trust.json
  echo "✓ rôle $ROLE : existe déjà (confiance mise à jour)"
else
  aws iam create-role --role-name "$ROLE" \
    --description "GitHub Actions (MaxenceRault/pokewish, main) : deploie la Lambda pokewish-api" \
    --assume-role-policy-document file://aws/github-deploy-trust.json >/dev/null
  echo "✓ rôle $ROLE : créé"
fi

aws iam put-role-policy --role-name "$ROLE" --policy-name deploy-lambda-code \
  --policy-document file://aws/github-deploy-policy.json
echo "✓ permission : mise à jour du code de la Lambda pokewish-api uniquement"

echo
echo "Rôle à utiliser dans la CI :"
aws iam get-role --role-name "$ROLE" --query Role.Arn --output text
