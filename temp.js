const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// GET- und POST-Anfragen auf /api/login
app.get('/api/login', (req, res) => {
  res.status(405).send('Method Not Allowed (GET)');
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Handle login logic here
  // Example:
  if (username === 'test' && password === 'test') {
    res.send('Login successful');
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Start server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//Der Code geht, gpt 4o fragen, ihn zu implementieren, 
//Änderungen:
//es soll wirklich in der Datenbank überprüft werden, ob da alles passt