const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');
const app = express();

mongoose.connect('mongodb://localhost:27017/testdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index.html');
});

app.get('/test', (req, res) => {
  res.render('test.html');
});

app.get('/register', (req, res) => {
  res.render('register.html');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  await user.save();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login.html');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await user.comparePassword(password)) {
    res.send('Login erfolgreich!');
  } else {
    res.send('Login fehlgeschlagen.');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
