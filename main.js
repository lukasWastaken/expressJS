const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');
const app = express();

mongoose.connect('mongodb://localhost:27017/squaresphere', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
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
  //res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log(`Login attempt for user: ${username}`);

    const user = await User.findOne({ username });

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden.' });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      console.log(`Incorrect password for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Falsches Passwort.' });
    }

    console.log(`User logged in successfully: ${username}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error during login for user: ${username}`, error);
    res.status(500).json({ success: false, message: 'Serverfehler, bitte versuchen Sie es später erneut.' });
  }
});





// Serve game files
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const options = {
    root: path.join(__dirname, 'files'),
    headers: {
      'Content-Disposition': `attachment; filename=${filename}`
    }
  };

  res.sendFile(filename, options, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(404).send('File not found');
    }
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
