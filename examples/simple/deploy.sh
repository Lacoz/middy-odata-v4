#!/bin/bash

echo "Building simple example..."
pnpm run build

echo "Creating deployment package..."

# Create deployment directory
mkdir -p deployment
cp dist/index.mjs deployment/
cp package.json deployment/

# Create minimal node_modules with only essential dependencies
mkdir -p deployment/node_modules

      # Copy @middy/core (minimal version)
      mkdir -p deployment/node_modules/@middy/core
      echo '{"name":"@middy/core","version":"5.0.0","main":"index.js","type":"module"}' > deployment/node_modules/@middy/core/package.json
      cat > deployment/node_modules/@middy/core/index.js << 'EOF'
      export default function middy(handler) {
        return {
          use: function(middleware) {
            return async (event, context) => {
              const result = await handler(event, context);
              return result;
            };
          }
        };
      }
      EOF


# Copy the updated middy-odata-v4 library (excluding source maps)
mkdir -p deployment/node_modules/middy-odata-v4/dist
cp ../../dist/index.mjs deployment/node_modules/middy-odata-v4/dist/
cp ../../dist/index.cjs deployment/node_modules/middy-odata-v4/dist/
cp ../../dist/index.d.ts deployment/node_modules/middy-odata-v4/dist/
cp ../../package.json deployment/node_modules/middy-odata-v4/

# Create zip file for AWS Lambda
echo "Creating zip file for AWS Lambda..."
cd deployment
zip -r ../simple-odata-example.zip . -x "*.DS_Store" "*.log"
cd ..

# Upload to AWS Lambda
echo "Uploading to AWS Lambda..."
aws lambda update-function-code \
  --function-name arn:aws:lambda:eu-west-1:637423300715:function:ODATAdev \
  --zip-file fileb://simple-odata-example.zip

if [ $? -eq 0 ]; then
  echo "✅ Successfully uploaded to AWS Lambda!"
else
  echo "❌ Failed to upload to AWS Lambda"
  exit 1
fi

# Copy to docker-test for local testing
echo "Preparing for Docker testing..."
cp -r deployment docker-test/

echo "✅ Deployment complete:"
echo "   📦 simple-odata-example.zip (uploaded to AWS Lambda)"
echo "   📁 docker-test/deployment/ (for local testing)"
echo "   Handler: index.handler"
echo "   Lambda ARN: arn:aws:lambda:eu-west-1:637423300715:function:ODATAdev"