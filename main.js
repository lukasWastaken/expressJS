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
    res.render('test.html')
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});