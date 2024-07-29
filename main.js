const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./models/User');
const MOTD = require('./models/motd');

const app = express();

mongoose.connect('mongodb://192.168.0.101:27017/squaresphere', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//app.use((req, res, next) => {
  //res.set('Cache-Control', 'no-store');
  //next();
//});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'scretsquaresphererkeyfdksfjkslaöjfiewtbaiefhdsl3meyjfkdlaöwefbiakakroordsioafijaskdlkakakjlkdjkl',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check if user is part of the team
function isTeamMember(req, res, next) {
  if (req.session.isTeam) {
    return next();
  }
  res.status(403).send('Forbidden');
}

app.get('/', (req, res) => {
  res.render('index.html');
});

app.get('/test', (req, res) => {
  res.send("Server's running!");
});

app.get('/status', (req, res) => {
  res.render('status.html');
});

/*
Login start
*/
app.get('/register', (req, res) => {
  res.render('register.html');
});

app.post('/register', async (req, res) => {
  const { username, password, accessLevel } = req.body;
  const user = new User({ username, password, accessLevel });
  await user.save();
  res.send('Account successfully registered');
});

app.get('/login', (req, res) => {
  res.render('login.html');
});

app.get('/api/login', (req, res) => {
  res.status(405).send('Method Not Allowed (squaresphere error)');
});

app.get('/api/register', (req, res) => {
  res.status(405).send('Method Not Allowed (squaresphere error)');
});

app.post('/login', async (req, res) => {
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

    req.session.userId = user._id;
    req.session.isTeam = user.team;
    res.json({ success: true, accessLevel: user.accessLevel });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out, please try again later.' });
    }
    res.redirect('/');
  });
});

/*
Login end
*/

/* MOTD Routes start */
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, isTeam: req.session.isTeam });
  } else {
    res.json({ loggedIn: false });
  }
});

// Aktualisiertes MOTD-Schema mit Timestamp-Feld
const motdSchema = new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

app.get('/api/motd', async (req, res) => {
  try {
    const motd = await MOTD.findOne();
    res.json({ success: true, motd: motd ? motd.text : '', timestamp: motd ? motd.timestamp : null });
  } catch (error) {
    console.error('Error fetching MOTD:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

// Route zum Speichern des MOTD
app.post('/api/motd', isAuthenticated, isTeamMember, async (req, res) => {
  const { text } = req.body;
  try {
    let motd = await MOTD.findOne();
    const timestamp = new Date();
    if (motd) {
      motd.text = text;
      motd.timestamp = timestamp;
    } else {
      motd = new MOTD({ text, timestamp });
    }
    await motd.save();
    res.json({ success: true, message: 'MOTD updated successfully' });
  } catch (error) {
    console.error('Error updating MOTD:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});
/* MOTD Routes end */

/*Game Files start*/ 
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
/*Game Files end*/ 

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
