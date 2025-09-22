import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { handler } from "./index.js";

async function invoke(path: string, rawQueryString = ""): Promise<void> {
  const queryParams = rawQueryString
    ? Object.fromEntries(new URLSearchParams(rawQueryString).entries())
    : undefined;

  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString,
    headers: {},
    requestContext: {
      accountId: "local",
      apiId: "local",
      routeKey: "$default",
      requestId: `local-${Date.now()}`,
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      http: {
        method: "GET",
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "local-runner",
      },
    },
    isBase64Encoded: false,
    queryStringParameters: queryParams,
  } as APIGatewayProxyEventV2;

  const context: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "local",
    functionVersion: "$LATEST",
    invokedFunctionArn: "local",
    memoryLimitInMB: "128",
    awsRequestId: `local-${Math.random().toString(16).slice(2)}`,
    logGroupName: "local",
    logStreamName: "local",
    getRemainingTimeInMillis: () => 1000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  };

  const response = (await handler(event, context)) as APIGatewayProxyResultV2;

  console.log("\n========================================");
  console.log(`${path}${rawQueryString ? `?${rawQueryString}` : ""}`);
  console.log("Status:", response.statusCode);
  console.log("Headers:", response.headers);
  console.log("Body:");
  console.log(response.body);
}

async function main(): Promise<void> {
  await invoke("/Users", "$top=2&$filter=isActive eq true");
  await invoke("/Tasks", "$orderby=completed desc&$top=3");
  await invoke("/RemoteProducts", "$select=ID,Name,Price&$top=2");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
