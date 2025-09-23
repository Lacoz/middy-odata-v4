import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index.ts";

const baseContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "middy-odata-http-demo",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:middy-odata-http-demo",
  memoryLimitInMB: "128",
  awsRequestId: "demo-request",
  logGroupName: "/aws/lambda/middy-odata-http-demo",
  logStreamName: "local/stream",
  getRemainingTimeInMillis: () => 5000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined
};

function createEvent(path: string, query: Record<string, string>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path,
    pathParameters: null,
    queryStringParameters: Object.keys(query).length > 0 ? query : null,
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
      path,
      stage: "local",
      requestId: `req-${Math.random().toString(36).slice(2)}`,
      requestTimeEpoch: Date.now(),
      resourceId: "local",
      resourcePath: "/{proxy+}"
    }
  };
}

async function invoke(path: string, query: Record<string, string>): Promise<void> {
  const event = createEvent(path, query);
  console.log(`\n=== ${path} ${new URLSearchParams(query).toString()} ===`);
  const response = await handler(event, baseContext, () => undefined);
  console.log(`Status: ${response.statusCode}`);
  console.log("Body:");
  console.log(response.body);
}

async function main(): Promise<void> {
  await invoke("/People", {
    "$select": "userName,firstName,lastName,city",
    "$top": "3"
  });

  await invoke("/Todos", {
    "$filter": "completed eq false",
    "$orderby": "title",
    "$top": "5"
  });
}

void main();
