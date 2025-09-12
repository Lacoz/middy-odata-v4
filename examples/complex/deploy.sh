#!/bin/bash
# Complex example deployment script

echo "Building complex example..."
npm run build

echo "Creating deployment package..."
zip -r complex-odata-example.zip dist/ package.json

echo "Deployment package created: complex-odata-example.zip"
echo "Upload this to AWS Lambda and configure API Gateway"
