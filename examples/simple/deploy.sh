#!/bin/bash
# Simple example deployment script

echo "Building simple example..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "Installing production dependencies..."
npm install --production

echo "Creating deployment package..."
zip -r simple-odata-example.zip dist/ node_modules/ package.json

echo "✅ Deployment package created: simple-odata-example.zip"
echo ""
echo "Next steps:"
echo "1. Upload simple-odata-example.zip to AWS Lambda"
echo "2. Set handler to: dist/index.odataHandler"
echo "3. Configure API Gateway with proxy integration"
echo "4. Test with: GET /Users"
