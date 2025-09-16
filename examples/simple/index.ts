import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { odata } from "middy-odata-v4";
import { EdmModel, ODataEntity } from "middy-odata-v4";
import { generateMetadata, generateServiceDocument } from "middy-odata-v4";

// Define the User entity type
interface User extends ODataEntity {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  createdAt: string;
}

// Mock data - in a real application, this would come from a database
const users: User[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    age: 30,
    active: true,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    age: 25,
    active: true,
    createdAt: "2024-01-16T11:30:00Z"
  },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    age: 35,
    active: false,
    createdAt: "2024-01-17T09:15:00Z"
  },
  {
    id: 4,
    name: "Alice Brown",
    email: "alice.brown@example.com",
    age: 28,
    active: true,
    createdAt: "2024-01-18T14:20:00Z"
  },
  {
    id: 5,
    name: "Charlie Wilson",
    email: "charlie.wilson@example.com",
    age: 42,
    active: true,
    createdAt: "2024-01-19T16:45:00Z"
  }
];

// Define the EDM model for the Users entity
const model: EdmModel = {
  entityTypes: {
    User: {
      name: "User",
      properties: {
        id: { type: "Edm.Int32", nullable: false },
        name: { type: "Edm.String", maxLength: 100 },
        email: { type: "Edm.String", maxLength: 255 },
        age: { type: "Edm.Int32", nullable: false },
        active: { type: "Edm.Boolean", nullable: false },
        createdAt: { type: "Edm.DateTimeOffset", nullable: false }
      },
      key: ["id"]
    }
  },
  entitySets: {
    Users: {
      name: "Users",
      entityType: "User"
    }
  },
  namespace: "SimpleExample"
};

// Main Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract the entity set from the path
    const pathSegments = event.path.split('/').filter(segment => segment);
    const entitySet = pathSegments[pathSegments.length - 1];

    // Route to the appropriate entity set
    switch (entitySet) {
      case 'Users':
        return await handleUsersRequest(event);
      case '$metadata':
        return await handleMetadataRequest(event);
      case '':
        // Handle service root requests
        return await handleServiceRootRequest(event);
      default:
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: {
              code: 'NotFound',
              message: `Entity set '${entitySet}' not found`
            }
          })
        };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: {
          code: 'InternalServerError',
          message: 'An internal server error occurred'
        }
      })
    };
  }
};

// Handle Users entity set requests
async function handleUsersRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const httpMethod = event.httpMethod;
  const pathSegments = event.path.split('/').filter(segment => segment);
  
  // Check if this is a request for a specific user by ID
  const userId = pathSegments[pathSegments.length - 1];
  const isSpecificUser = !isNaN(Number(userId));

  switch (httpMethod) {
    case 'GET':
      if (isSpecificUser) {
        return await getUserById(Number(userId));
      } else {
        return await getAllUsers();
      }
    case 'POST':
      return await createUser(event);
    case 'PUT':
    case 'PATCH':
      if (isSpecificUser) {
        return await updateUser(Number(userId), event);
      } else {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: { code: 'BadRequest', message: 'User ID required for update' }
          })
        };
      }
    case 'DELETE':
      if (isSpecificUser) {
        return await deleteUser(Number(userId));
      } else {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: { code: 'BadRequest', message: 'User ID required for deletion' }
          })
        };
      }
    default:
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: { code: 'MethodNotAllowed', message: `Method ${httpMethod} not allowed` }
        })
      };
  }
}

// Get all users (with OData query options applied by middleware)
async function getAllUsers(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(users)
  };
}

// Get a specific user by ID
async function getUserById(id: number): Promise<APIGatewayProxyResult> {
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'NotFound', message: `User with ID ${id} not found` }
      })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  };
}

// Create a new user
async function createUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userData = JSON.parse(event.body || '{}');
    
    // Generate new ID
    const newId = Math.max(...users.map(u => u.id)) + 1;
    
    const newUser: User = {
      id: newId,
      name: userData.name || '',
      email: userData.email || '',
      age: userData.age || 0,
      active: userData.active !== undefined ? userData.active : true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'BadRequest', message: 'Invalid JSON in request body' }
      })
    };
  }
}

// Update an existing user
async function updateUser(id: number, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'NotFound', message: `User with ID ${id} not found` }
      })
    };
  }

  try {
    const updateData = JSON.parse(event.body || '{}');
    const existingUser = users[userIndex];
    
    // Update only provided fields
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      id: existingUser.id, // Don't allow ID changes
      createdAt: existingUser.createdAt // Don't allow creation date changes
    };

    users[userIndex] = updatedUser;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser)
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'BadRequest', message: 'Invalid JSON in request body' }
      })
    };
  }
}

// Delete a user
async function deleteUser(id: number): Promise<APIGatewayProxyResult> {
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'NotFound', message: `User with ID ${id} not found` }
      })
    };
  }

  users.splice(userIndex, 1);

  return {
    statusCode: 204,
    headers: { 'Content-Type': 'application/json' },
    body: ''
  };
}

// Handle metadata requests using library functionality
async function handleMetadataRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const serviceRoot = 'https://api.example.com/odata';
    const metadata = generateMetadata(model, serviceRoot);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'OData-Version': '4.01'
      },
      body: JSON.stringify(metadata)
    };
  } catch (error) {
    console.error('Metadata generation error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'InternalServerError', message: 'Failed to generate metadata' }
      })
    };
  }
}

// Handle service root requests
async function handleServiceRootRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const serviceRoot = 'https://api.example.com/odata';
    const serviceDocument = generateServiceDocument(model, serviceRoot);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'OData-Version': '4.01'
      },
      body: JSON.stringify(serviceDocument)
    };
  } catch (error) {
    console.error('Service document generation error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'InternalServerError', message: 'Failed to generate service document' }
      })
    };
  }
}

// Apply the OData middleware
export const odataHandler = odata({
  model,
  serviceRoot: 'https://api.example.com/odata',
  enableMetadata: true,
  enableCount: true,
  maxTop: 100
})(handler);
