#!/usr/bin/env bash
# Déploie l'API Hono sur AWS Lambda + API Gateway (HTTP API).
# Rejouable : crée ce qui manque, met à jour le reste.
#
#   cd back && npm run deploy:lambda
#
# Lit back/.env :
#   DATABASE_URL         Supabase. Pour Lambda, le pooler « Transaction »
#                        (port 6543) est conseillé : s'il n'est pas fourni via
#                        LAMBDA_DATABASE_URL, il est déduit de DATABASE_URL.
#   LAMBDA_CORS_ORIGINS  origines du front autorisées (défaut : localhost:3000)
#   AWS_REGION           défaut eu-north-1 (Stockholm, comme la base Supabase)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && { set -a; . ./.env; set +a; }

REGION="${AWS_REGION:-eu-north-1}"
FUNCTION="pokewish-api"
ROLE="pokewish-api-lambda"
API="pokewish-api"
RUNTIME="${LAMBDA_RUNTIME:-nodejs22.x}"
CORS="${LAMBDA_CORS_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"
: "${DATABASE_URL:?DATABASE_URL manquant dans back/.env}"
# Pooler « Transaction » : même hôte Supabase, port 6543
DB_URL="${LAMBDA_DATABASE_URL:-${DATABASE_URL/:5432\//:6543/}}"

aws() { command aws --region "$REGION" --output text "$@"; }
step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

step "Paquet Lambda"
npm run build:lambda --silent
rm -f lambda.zip
(cd dist-lambda && zip -q ../lambda.zip index.mjs)
echo "lambda.zip : $(du -h lambda.zip | cut -f1)"

# Variables d'environnement en JSON : l'URL contient : @ / qui cassent la
# syntaxe raccourcie de l'AWS CLI.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
node -e 'console.log(JSON.stringify({ Variables: {
  DATABASE_URL: process.argv[1], CORS_ORIGINS: process.argv[2] } }))' \
  "$DB_URL" "$CORS" > "$ENV_FILE"

step "Rôle IAM $ROLE"
if ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn 2>/dev/null); then
  echo "existe déjà"
else
  ROLE_ARN=$(aws iam create-role --role-name "$ROLE" --query Role.Arn \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}')
  # Seul droit nécessaire : écrire ses logs dans CloudWatch
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "créé, attente de la propagation IAM…"
  sleep 10
fi

step "Fonction Lambda $FUNCTION ($RUNTIME, $REGION)"
if aws lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION" \
    --zip-file fileb://lambda.zip >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION"
  aws lambda update-function-configuration --function-name "$FUNCTION" \
    --environment "file://$ENV_FILE" >/dev/null
  echo "code et configuration mis à jour"
else
  aws lambda create-function --function-name "$FUNCTION" \
    --runtime "$RUNTIME" --handler index.handler --role "$ROLE_ARN" \
    --zip-file fileb://lambda.zip --architectures arm64 \
    --memory-size 256 --timeout 10 \
    --environment "file://$ENV_FILE" >/dev/null
  echo "créée"
fi
aws lambda wait function-updated --function-name "$FUNCTION"
FUNCTION_ARN=$(aws lambda get-function --function-name "$FUNCTION" \
  --query Configuration.FunctionArn)

step "API Gateway $API (HTTP API)"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API'].ApiId | [0]")
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  # « Quick create » : route $default + intégration Lambda + stage auto-déployé.
  # Pas de CORS ici : c'est Hono qui le gère (sinon les en-têtes seraient doublés).
  API_ID=$(aws apigatewayv2 create-api --name "$API" --protocol-type HTTP \
    --target "$FUNCTION_ARN" --query ApiId)
  echo "créée"
else
  echo "existe déjà"
fi

# Autorise API Gateway à appeler la Lambda (ignoré si déjà fait)
ACCOUNT=$(aws sts get-caller-identity --query Account)
aws lambda add-permission --function-name "$FUNCTION" \
  --statement-id apigateway-invoke --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT:$API_ID/*" \
  >/dev/null 2>&1 || true

URL=$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint)

step "Vérification"
for path in /health /wishlist; do
  printf '%-10s ' "$path"
  curl -s -w '  -> HTTP %{http_code}\n' "$URL$path"
done

printf '\n\033[1mAPI déployée : %s\033[0m\n' "$URL"
echo "Front : NUXT_PUBLIC_API_BASE=$URL npm run dev"
