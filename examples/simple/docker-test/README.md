# Local Testing

Test the Lambda function locally using Docker.

## Run Tests

```bash
./test.sh
```

## What it tests

- ✅ GET /Users - Returns users list
- ✅ GET /$metadata - Returns OData metadata  
- ✅ GET / - Returns service document
- ✅ GET /NonExistent - Returns 404 error
