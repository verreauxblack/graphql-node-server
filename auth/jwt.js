const { ApolloServer, gql, AuthenticationError } = require('apollo-server-express'); // Import AuthenticationError
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const data = require('../data.json');

const JWT_SECRET = 'mysecretkey123'; // Use environment variables in production
const validUsername = 'admin';
const validPassword = 'password123';

const app = express();
app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '5m' });
};

// REST API route for login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === validUsername && password === validPassword) {
    const token = generateToken({ username });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Middleware to check JWT token before the request reaches Apollo Server
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach decoded token data to the request object
    } catch (err) {
      console.error('Invalid or expired token:', err);

      // Set status code to 401 Unauthorized for invalid or expired token
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
  next(); // Proceed to the next middleware (Apollo Server)
});

// GraphQL schema
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

// Resolvers for GraphQL
const resolvers = {
  Query: {
    posts: (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return data.posts;
    },
    users: (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return data.users;
    },
    comments: (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return data.comments;
    },
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

// Apollo Server with JWT authentication via context
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Return the authenticated user in the context
    return { user: req.user }; // Attach the user from the middleware
  },
});

// Apply Apollo Server as middleware to Express app
apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app });

  // Start the server
  app.listen({ port: 4000 }, () => {
    console.log(`🚀 Server ready at http://localhost:4000${apolloServer.graphqlPath}`);
    console.log('REST API for login is available at http://localhost:4000/login');
  });
});
