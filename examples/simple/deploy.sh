#!/bin/bash
# Simple example deployment script

echo "Building simple example..."
npm run build

echo "Creating deployment package..."
zip -r simple-odata-example.zip dist/ package.json

echo "Deployment package created: simple-odata-example.zip"
echo "Upload this to AWS Lambda and configure API Gateway"
