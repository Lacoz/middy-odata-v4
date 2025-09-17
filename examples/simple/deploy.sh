#!/bin/bash

# Configuration
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-arn:aws:lambda:eu-west-1:637423300715:function:ODATAdev}"

echo "Building simple example..."
pnpm run build

echo "Creating minimal deployment package..."
# Create clean deployment directory
rm -rf deployment
mkdir -p deployment
cp dist/index.mjs deployment/
cp package.json deployment/

# Create minimal node_modules with only essential runtime dependencies
mkdir -p deployment/node_modules

# Copy @middy/core (only essential files)
mkdir -p deployment/node_modules/@middy/core
cp ../../node_modules/@middy/core/index.js deployment/node_modules/@middy/core/
cp ../../node_modules/@middy/core/package.json deployment/node_modules/@middy/core/
cp ../../node_modules/@middy/core/index.d.ts deployment/node_modules/@middy/core/

# Copy middy-odata-v4 (only dist files, no source)
mkdir -p deployment/node_modules/middy-odata-v4/dist
cp ../../dist/index.mjs deployment/node_modules/middy-odata-v4/dist/
cp ../../dist/index.cjs deployment/node_modules/middy-odata-v4/dist/
cp ../../dist/index.d.ts deployment/node_modules/middy-odata-v4/dist/
cp ../../package.json deployment/node_modules/middy-odata-v4/

# Create zip file for AWS Lambda
echo "Creating zip file for AWS Lambda..."
cd deployment
zip -r ../simple-odata-example.zip . -x "*.DS_Store" "*.log" "*.map"
cd ..

# Check zip file size
ZIP_SIZE=$(stat -f%z simple-odata-example.zip 2>/dev/null || stat -c%s simple-odata-example.zip 2>/dev/null)
ZIP_SIZE_MB=$((ZIP_SIZE / 1024 / 1024))
MAX_SIZE_MB=10

echo "📦 Zip file size: ${ZIP_SIZE} bytes (${ZIP_SIZE_MB}MB)"

if [ $ZIP_SIZE_MB -gt $MAX_SIZE_MB ]; then
  echo "❌ ERROR: Zip file size (${ZIP_SIZE_MB}MB) exceeds maximum allowed size (${MAX_SIZE_MB}MB)"
  echo "   This usually indicates that unnecessary dependencies are being included."
  echo "   Please check the deployment package and remove any large unnecessary files."
  exit 1
fi

echo "✅ Zip file size is acceptable (${ZIP_SIZE_MB}MB <= ${MAX_SIZE_MB}MB)"

# Upload to AWS Lambda
echo "Uploading to AWS Lambda..."
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file fileb://simple-odata-example.zip

if [ $? -eq 0 ]; then
  echo "✅ Successfully uploaded to AWS Lambda!"
else
  echo "❌ Failed to upload to AWS Lambda"
  exit 1
fi

echo "✅ Deployment complete:"
echo "   📦 simple-odata-example.zip (uploaded to AWS Lambda)"
echo "   Handler: index.handler"
echo "   Lambda ARN: $LAMBDA_FUNCTION_NAME"