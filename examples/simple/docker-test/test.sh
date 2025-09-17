#!/bin/bash

echo "🚀 Testing Simple OData Example..."

# Simple usage: ./test.sh [lambda_url]
# If no URL provided, test local Docker
# If URL provided, test live Lambda

lambda_url="$1"

if [ -n "$lambda_url" ]; then
    echo "Testing live Lambda at: $lambda_url"
    test_mode="live"
else
    echo "Testing local Docker container"
    test_mode="docker"
fi

echo ""

# Simple test cases - no complex escaping needed
test_cases=(
    "GET /Users"
    "GET /%24metadata"
    "GET /"
    "GET /NonExistent"
    "GET /Users?%24filter=active%20eq%20true"
    "GET /Users?%24orderby=age%20desc"
    "GET /Users?%24select=name,email"
    "GET /Users?%24top=1"
)

passed=0
total=${#test_cases[@]}

for test_case in "${test_cases[@]}"; do
    echo "🧪 Testing: $test_case"
    
    # Extract path from test case
    path="${test_case#GET }"
    
    if [ "$test_mode" = "live" ]; then
        # Test live Lambda - simple curl
        full_url="$lambda_url$path"
        response=$(curl -s -w "%{http_code}" "$full_url" -H "Content-Type: application/json" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$response" ]; then
            status_code="${response: -3}"
            body="${response%???}"
            
            echo "✅ Response received - Status: $status_code"
            echo "   Response:"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            ((passed++))
        else
            echo "❌ ERROR - Failed to connect to Lambda"
        fi
    else
        # Test local Docker - parse query parameters from path
        if [[ "$path" == *"?"* ]]; then
            path_only="${path%%\?*}"
            query_string="${path#*\?}"
            # Parse query string into JSON object
            query_params="{}"
            IFS='&' read -ra PARAMS <<< "$query_string"
            for param in "${PARAMS[@]}"; do
                if [[ "$param" == *"="* ]]; then
                    key="${param%%=*}"
                    value="${param#*=}"
                    # URL decode the value
                    value=$(printf '%b\n' "${value//%/\\x}")
                    # Add to query_params JSON object
                    if [ "$query_params" = "{}" ]; then
                        query_params="{\"$key\":\"$value\"}"
                    else
                        query_params=$(echo "$query_params" | jq ". + {\"$key\":\"$value\"}")
                    fi
                fi
            done
            event_json="{\"httpMethod\":\"GET\",\"path\":\"$path_only\",\"rawPath\":\"$path_only\",\"rawQueryString\":\"$query_string\",\"headers\":{\"Content-Type\":\"application/json\"},\"queryStringParameters\":$query_params,\"body\":null}"
        else
            event_json="{\"httpMethod\":\"GET\",\"path\":\"$path\",\"rawPath\":\"$path\",\"headers\":{\"Content-Type\":\"application/json\"},\"queryStringParameters\":null,\"body\":null}"
        fi
        
        response=$(echo "$event_json" | docker run --rm -i --entrypoint="" lambda-test node -e "
import('./index.mjs').then(module => {
  const handler = module.handler;
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', async () => {
    try {
      const event = JSON.parse(input);
      const result = await handler(event);
      console.log(JSON.stringify(result));
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
});
" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$response" ]; then
            status_code=$(echo "$response" | jq -r '.statusCode // "unknown"')
            echo "✅ Response received - Status: $status_code"
            echo "   Response:"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
            ((passed++))
        else
            echo "❌ ERROR - Failed to get response from Lambda"
        fi
    fi
    
    echo ""
done

# Summary
echo "📊 Test Summary: $passed/$total tests completed"

if [ $passed -eq $total ]; then
    echo "🎉 All tests completed successfully!"
    exit 0
else
    echo "💥 Some tests had issues!"
    exit 1
fi