const { ApolloServer, gql } = require('apollo-server');
const data = require('../data.json');

// Dummy username and password for basic authentication
const validUsername = 'admin';
const validPassword = 'password123';

// Helper function to decode base64 credentials
const decodeBase64 = (base64String) => {
  return Buffer.from(base64String, 'base64').toString('ascii');
};

// Define your type definitions (schema)
const typeDefs = gql`
  type Query {
    posts: [Post!]!
    users: [User!]!
    comments: [Comment!]!
  }

  type Post {
    id: ID!
    title: String!
    author: User!
    comments: [Comment!]!
  }

  type User {
    id: ID!
    name: String!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
  }
`;

// Define your resolvers
const resolvers = {
  Query: {
    posts: () => data.posts,
    users: () => data.users,
    comments: () => data.comments,
  },
  Post: {
    author: (parent) => data.users.find((user) => user.id === parent.author),
    comments: (parent) =>
      data.comments.filter((comment) => comment.postId === parent.id),
  },
  Comment: {
    author: (parent) => data.users.find((user) => user.id === parent.author),
  },
};
// Custom error class for authentication errors
class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
      this.extensions = {
        code: 'UNAUTHENTICATED',
        status: 401
      };
    }
  }

// Create an Apollo Server instance with authentication in the context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Get the Authorization header
    const authHeader = req.headers.authorization || '';

    // Basic auth is usually in the format "Basic base64(username:password)"
    if (!authHeader.startsWith('Basic ')) {
      throw new AuthenticationError('Missing Authorization header');
    }

    // Decode the base64 part of the Authorization header
    const base64Credentials = authHeader.split(' ')[1];
    const decodedCredentials = decodeBase64(base64Credentials);

    // Extract the username and password
    const [username, password] = decodedCredentials.split(':');

    // Validate the username and password
    if (username !== validUsername || password !== validPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // If valid, proceed with the request (you can also add user info to context)
    return { user: { username } };
  },
});

// Start the server
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
