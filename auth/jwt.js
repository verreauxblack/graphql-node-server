const { ApolloServer, gql, AuthenticationError } = require('apollo-server-express');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const data = require('../data.json');

const JWT_SECRET = 'mysecretkey123';
const validUsername = 'admin';
const validPassword = 'password123';

const app = express();
app.use(bodyParser.json());

const generateToken = (user) => {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '5m' });
};

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === validUsername && password === validPassword) {
    const token = generateToken({ username });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.error('Invalid or expired token:', err);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
  next();
});

const typeDefs = gql`
  type Query {
    posts: [Post!]!
    users: [User!]!
    comments: [Comment!]!
  }

  type Mutation {
    addPost(title: String!, authorId: ID!): Post!
    addUser(name: String!): User!
    addComment(content: String!, postId: ID!, authorId: ID!): Comment!
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
  Mutation: {
    addPost: (parent, { title, authorId }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      const newPost = { id: String(data.posts.length + 1), title, author: authorId, comments: [] };
      data.posts.push(newPost);
      return newPost;
    },
    addUser: (parent, { name }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      const newUser = { id: String(data.users.length + 1), name };
      data.users.push(newUser);
      return newUser;
    },
    addComment: (parent, { content, postId, authorId }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      const newComment = { id: String(data.comments.length + 1), content, author: authorId, postId };
      data.comments.push(newComment);
      return newComment;
    },
  },
  Post: {
    author: (parent) => data.users.find((user) => user.id === parent.author),
    comments: (parent) => data.comments.filter((comment) => comment.postId === parent.id),
  },
  Comment: {
    author: (parent) => data.users.find((user) => user.id === parent.author),
  },
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    return { user: req.user };
  },
  introspection: true,
});

apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app });
  app.listen({ port: 4000 }, () => {
    console.log(`🚀 Server ready at http://localhost:4000${apolloServer.graphqlPath}`);
    console.log('REST API for login is available at http://localhost:4000/login');
  });
});
