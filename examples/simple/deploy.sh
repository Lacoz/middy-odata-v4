#!/bin/bash

echo "Building simple example..."
pnpm run build

echo "Creating deployment package..."

# Create deployment directory
mkdir -p deployment
cp dist/index.mjs deployment/
cp package.json deployment/

# Copy only the middy-odata-v4 library
mkdir -p deployment/node_modules/middy-odata-v4/dist
cp -r ../../dist/* deployment/node_modules/middy-odata-v4/dist/
cp ../../package.json deployment/node_modules/middy-odata-v4/

# Create zip file for AWS Lambda
echo "Creating zip file for AWS Lambda..."
cd deployment
zip -r ../simple-odata-example.zip . -x "*.DS_Store" "*.log"
cd ..

# Copy to docker-test for local testing
echo "Preparing for Docker testing..."
cp -r deployment docker-test/

echo "✅ Deployment package ready:"
echo "   📦 simple-odata-example.zip (for AWS Lambda)"
echo "   📁 docker-test/deployment/ (for local testing)"
echo "   Handler: index.handler"