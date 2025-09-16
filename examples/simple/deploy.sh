#!/bin/bash

echo "Building simple example..."
pnpm run build

echo "Preparing for Docker testing..."

# Create docker-test deployment directory
mkdir -p docker-test/deployment
cp dist/index.mjs docker-test/deployment/
cp package.json docker-test/deployment/

# Copy only the middy-odata-v4 library
mkdir -p docker-test/deployment/node_modules/middy-odata-v4/dist
cp -r ../../dist/* docker-test/deployment/node_modules/middy-odata-v4/dist/
cp ../../package.json docker-test/deployment/node_modules/middy-odata-v4/

echo "✅ Ready for Docker testing in 'docker-test/deployment/' directory"
echo "Handler: index.handler"