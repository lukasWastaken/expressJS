const express = require('express');
const path = require('path');

const app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index.html');
});

app.get('/test', (req, res) => {
  res.render('test.html');
});

app.get('/status', (req, res) => {
  res.render('status.html');
});

app.listen(3001, () => {
  console.log('Web Server running on http://localhost:3001');
});
