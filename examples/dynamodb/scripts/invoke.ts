import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index.ts";

const event: APIGatewayProxyEvent = {
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: "GET",
  isBase64Encoded: false,
  path: "/Users",
  pathParameters: null,
  queryStringParameters: {
    "$filter": "isActive eq true",
    "$top": "2",
    "$count": "true"
  },
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: "/{proxy+}",
  requestContext: {
    accountId: "000000000000",
    apiId: "local",
    authorizer: {},
    protocol: "HTTP/1.1",
    httpMethod: "GET",
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: "local-test",
      userArn: null
    },
    path: "/Users",
    stage: "local",
    requestId: "test-request",
    requestTimeEpoch: Date.now(),
    resourceId: "local",
    resourcePath: "/{proxy+}"
  }
};

const context: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "middy-odata-dynamo-demo",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:middy-odata-dynamo-demo",
  memoryLimitInMB: "128",
  awsRequestId: "demo-request",
  logGroupName: "/aws/lambda/middy-odata-dynamo-demo",
  logStreamName: "local/stream",
  getRemainingTimeInMillis: () => 3000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined
};

async function main(): Promise<void> {
  const response = await handler(event, context, () => undefined);
  console.log(`Status: ${response.statusCode}`);
  console.log("Headers:", response.headers);
  console.log("Body:");
  console.log(response.body);
}

void main();
