#!/bin/bash

echo "Building simple example..."
pnpm run build

echo "Creating deployment package..."

# Create deployment directory
mkdir -p extracted
cp dist/index.mjs extracted/
cp package.json extracted/

# Copy only the middy-odata-v4 library
mkdir -p extracted/node_modules/middy-odata-v4/dist
cp -r ../../dist/* extracted/node_modules/middy-odata-v4/dist/
cp ../../package.json extracted/node_modules/middy-odata-v4/

echo "✅ Deployment package ready in 'extracted/' directory"
echo "Handler: index.handler"