const jsonGraphqlExpress = require('json-graphql-server');
const express = require('express');
// const data = require('./data.json'); 
const data = require('./small.data.set.json'); 

const app = express();

// Log data to check if it is loaded correctly
console.log('Loaded Data:', JSON.stringify(data, null, 2));

// Correct usage of jsonGraphqlExpress
app.use('/graphql', jsonGraphqlExpress(data));

// Start the server
app.listen(4000, () => {
  console.log('Mock GraphQL server running at http://localhost:4000/graphql');
});
