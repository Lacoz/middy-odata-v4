#!/bin/bash

echo "🚀 Testing Simple OData Example..."

# Test cases
test_cases=(
    "GET /Users:200"
    "GET /\$metadata:200"
    "GET /:200"
    "GET /NonExistent:404"
)

passed=0
total=${#test_cases[@]}

for test_case in "${test_cases[@]}"; do
    IFS=':' read -r endpoint expected_status <<< "$test_case"
    
    echo "🧪 Testing: $endpoint"
    
    # Extract path from endpoint
    path="${endpoint#GET }"
    
    # Create Lambda event
    event_json="{\"httpMethod\":\"GET\",\"path\":\"$path\",\"headers\":{\"Content-Type\":\"application/json\",\"OData-Version\":\"4.01\"},\"queryStringParameters\":null,\"pathParameters\":null,\"body\":null}"
    
    # Run Lambda function
    response=$(echo "$event_json" | docker run --rm -i --entrypoint="" lambda-test node test-runner.js 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        status_code=$(echo "$response" | jq -r '.statusCode // "unknown"')
        
        if [ "$status_code" = "$expected_status" ]; then
            echo "✅ PASS - Status: $status_code"
            ((passed++))
        else
            echo "❌ FAIL - Expected: $expected_status, Got: $status_code"
        fi
        
        # Show response
        echo "   Response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        
    else
        echo "❌ ERROR - Failed to get response from Lambda"
    fi
    
    echo ""
done

# Summary
echo "📊 Test Summary: $passed/$total tests passed"

if [ $passed -eq $total ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "💥 Some tests failed!"
    exit 1
fi
