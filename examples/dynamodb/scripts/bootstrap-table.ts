import { CreateTableCommand, DescribeTableCommand, DynamoDBClient, ResourceNotFoundException, UpdateTableCommand } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME ?? "ODataUsers";
const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

const baseClient = new DynamoDBClient({
  region: AWS_REGION,
  ...(DYNAMODB_ENDPOINT ? { endpoint: DYNAMODB_ENDPOINT } : {}),
});
const documentClient = DynamoDBDocumentClient.from(baseClient);

const sampleUsers = [
  {
    id: "USR-1000",
    displayName: "Ada Lovelace",
    email: "ada@example.com",
    joinDate: "2022-01-15T09:30:00.000Z",
    isActive: true,
    tags: ["engineer", "admin"]
  },
  {
    id: "USR-1001",
    displayName: "Grace Hopper",
    email: "grace@example.com",
    joinDate: "2022-04-10T14:12:00.000Z",
    isActive: true,
    tags: ["engineer"]
  },
  {
    id: "USR-1002",
    displayName: "Alan Turing",
    email: "alan@example.com",
    joinDate: "2023-02-01T08:00:00.000Z",
    isActive: false,
    tags: ["research", "mathematics"]
  }
];

async function ensureTable(): Promise<void> {
  try {
    await baseClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists.`);
    await maybeUpdateThroughput();
    return;
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) {
      throw error;
    }
  }

  console.log(`Creating table ${TABLE_NAME}...`);
  await baseClient.send(new CreateTableCommand({
    TableName: TABLE_NAME,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }]
  }));

  await waitForTableActive();
}

async function maybeUpdateThroughput(): Promise<void> {
  // When the table already exists in provisioned mode, switch it to on-demand for easy demos.
  const description = await baseClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  if (description.Table?.BillingModeSummary?.BillingMode === "PROVISIONED") {
    console.log(`Updating table ${TABLE_NAME} to use on-demand capacity`);
    await baseClient.send(new UpdateTableCommand({ TableName: TABLE_NAME, BillingMode: "PAY_PER_REQUEST" }));
    await waitForTableActive();
  }
}

async function waitForTableActive(): Promise<void> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await baseClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    const status = response.Table?.TableStatus;
    console.log(`Table status: ${status}`);
    if (status === "ACTIVE") {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for table ${TABLE_NAME} to become ACTIVE`);
}

async function seedData(): Promise<void> {
  console.log(`Seeding ${sampleUsers.length} users into ${TABLE_NAME}`);
  const items = sampleUsers.map(user => ({ PutRequest: { Item: user } }));
  const chunks: typeof items[] = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await documentClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: chunk
      }
    }));
  }
}

async function main(): Promise<void> {
  try {
    await ensureTable();
    await seedData();
    console.log("Bootstrap complete.");
  } catch (error) {
    console.error("Failed to bootstrap DynamoDB table", error);
    process.exitCode = 1;
  }
}

void main();
