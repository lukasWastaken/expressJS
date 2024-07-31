const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./models/User');
const MOTD = require('./models/motd');
const Release = require('./models/Release');

const app = express();
const RECONNECT_INTERVAL = 10000; // 10 Sekunden in Millisekunden

const dbUrl = "mongodb://localhost:27017/squaresphere";

// Funktion zur Verbindung mit der Datenbank
async function connectToDatabase() {
  try {
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    console.log(`Retrying in ${RECONNECT_INTERVAL / 1000} seconds...`);
    setTimeout(connectToDatabase, RECONNECT_INTERVAL);
  }
}

// Initialer Verbindungsversuch
connectToDatabase();

// Überprüfen der Verbindung bei jedem Request
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) { // 1 bedeutet verbunden
    console.error('No MongoDB connection available.');
  }
  next();
});

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

// Middleware to check if user is an admin (team member)
function isAdmin(req, res, next) {
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

app.get('/status', isAuthenticated, (req, res) => {
  res.render('status.html');
});

/* Login routes */
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

/* MOTD Routes */
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, isTeam: req.session.isTeam });
  } else {
    res.json({ loggedIn: false });
  }
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

/* Release Routes */
app.get('/releases', isAuthenticated, async (req, res) => {
  try {
    const releases = await Release.find().sort({ timestamp: -1 });
    res.render('releases.html', { releases, isAdmin: req.session.isTeam });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.get('/releases/:id', isAuthenticated, async (req, res) => {
  try {
    const release = await Release.findById(req.params.id);
    if (!release) {
      return res.status(404).send('Release not found');
    }
    res.render('release-details.html', { release });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.post('/api/releases', isAuthenticated, isTeamMember, async (req, res) => {
  const { title, channel, evocati, features, bugFixes, knownIssues } = req.body;

  try {
    const newRelease = new Release({ title, channel, evocati, features, bugFixes, knownIssues });
    await newRelease.save();
    res.json({ success: true, message: 'Release created successfully' });
  } catch (error) {
    console.error('Error creating release:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.put('/api/releases/:id', isAuthenticated, isTeamMember, async (req, res) => {
  const { title, channel, evocati, features, bugFixes, knownIssues } = req.body;

  try {
    const release = await Release.findByIdAndUpdate(req.params.id, { title, channel, evocati, features, bugFixes, knownIssues }, { new: true });
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    res.json({ success: true, message: 'Release updated successfully' });
  } catch (error) {
    console.error('Error updating release:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.delete('/api/releases/:id', isAuthenticated, isTeamMember, async (req, res) => {
  try {
    const release = await Release.findByIdAndDelete(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    res.json({ success: true, message: 'Release deleted successfully' });
  } catch (error) {
    console.error('Error deleting release:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

/* Game Files */
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const options = {
    root: path.join(__dirname, 'public', 'files')
  };

  res.sendFile(filename, options, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(err.status).end();
    } else {
      console.log('Sent:', filename);
    }
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
