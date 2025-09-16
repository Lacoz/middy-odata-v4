#!/bin/bash

echo "🚀 Testing Live Lambda Function..."

# Get Lambda URL from user input
if [ -z "$1" ]; then
    echo "Enter your Lambda URL (or press Enter for default):"
    read -r lambda_url
    if [ -z "$lambda_url" ]; then
        lambda_url="https://myx5r6j2m5tk45ukptscvgcova0exlet.lambda-url.eu-west-1.on.aws"
    fi
else
    lambda_url="$1"
fi

echo "Testing Lambda at: $lambda_url"
echo ""

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
    
    # Make HTTP request to live Lambda
    response=$(curl -s -w "%{http_code}" "$lambda_url$path" -H "Content-Type: application/json" -H "OData-Version: 4.01" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Extract status code (last 3 characters)
        status_code="${response: -3}"
        # Extract body (everything except last 3 characters)
        body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            echo "✅ PASS - Status: $status_code"
            ((passed++))
        else
            echo "❌ FAIL - Expected: $expected_status, Got: $status_code"
        fi
        
        # Show response
        echo "   Response:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        
    else
        echo "❌ ERROR - Failed to connect to Lambda"
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
