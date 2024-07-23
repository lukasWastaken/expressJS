const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');
const e = require('express');
const app = express();


  mongoose.connect('mongodb://192.168.0.101:27017/squaresphere', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });


app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
  res.render('status.html')
})

app.get('/register', (req, res) => {
  res.render('register.html');
});
app.post('/register', async (req, res) => {
  const { username, password, accessLevel } = req.body;
  const user = new User({ username, password, accessLevel });
  await user.save();
  res.send('Account successfully registered')
});

app.get('/login', (req, res) => {
  res.render('login.html');
});

app.get('/api/login', (req, res) => {
  res.status(405).send('Method Not Allowed (squaresphere error)');
});
app.get('/api/register', (req, res) => {
  res.status(405).send('Method Not Allowed (squaresphere error');
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    res.json({ success: true, accessLevel: user.accessLevel });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
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
      if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') {
        console.warn('Client aborted the download request');
      } else {
        console.error('Error sending file:', err);
        res.status(404).send('File not found');
      }
    }
  });
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});