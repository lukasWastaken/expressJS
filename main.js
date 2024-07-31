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

app.get('/api/status/database', async (req, res) => {
  try {
    // Überprüfen Sie den aktuellen Verbindungsstatus
    if (mongoose.connection.readyState === 1) { // 1 bedeutet verbunden
      res.json({ status: 'operational' });
    } else {
      res.json({ status: 'down' });
    }
  } catch (error) {
    console.error('Fehler beim Überprüfen der Datenbankverbindung:', error);
    res.json({ status: 'down' });
  }
});

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
    const releases = await Release.find({ $or: [{ public: true }, { public: false, user: req.session.userId }] }).sort({ timestamp: -1 });
    res.render('releases.html', { releases, isAdmin: req.session.isTeam });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.get('/releases/:id', isAuthenticated, async (req, res) => {
  try {
    const release = await Release.findById(req.params.id);
    if (!release || (!release.public && !req.session.isTeam)) {
      return res.status(404).send('Release not found');
    }
    res.render('release-details.html', { release });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.post('/api/releases', isAuthenticated, isTeamMember, async (req, res) => {
  const { title, channel, public, features, bugFixes, knownIssues } = req.body;

  try {
    const newRelease = new Release({ title, channel, public, features, bugFixes, knownIssues });
    await newRelease.save();
    res.json({ success: true, message: 'Release created successfully' });
  } catch (error) {
    console.error('Error creating release:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.put('/api/releases/:id', isAuthenticated, isTeamMember, async (req, res) => {
  const { title, channel, public, features, bugFixes, knownIssues } = req.body;

  try {
    const release = await Release.findById(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    release.title = title;
    release.channel = channel;
    release.public = public;
    release.features = features;
    release.bugFixes = bugFixes;
    release.knownIssues = knownIssues;

    await release.save();
    res.json({ success: true, message: 'Release updated successfully' });
  } catch (error) {
    console.error('Error updating release:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});


/* Admin routes */
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin.html');
});

/* Admin: Manage Users */
app.get('/admin/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin-users.html', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

/* Admin: Manage Releases */
app.get('/admin/releases', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const releases = await Release.find().sort({ timestamp: -1 });
    res.render('admin-releases.html', { releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

/* Admin: Manage MOTD */
app.get('/admin/motd', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const motd = await MOTD.findOne();
    res.render('admin-motd.html', { motd: motd ? motd.text : '' });
  } catch (error) {
    console.error('Error fetching MOTD:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.get('/api/releases', async (req, res) => {
  try {
    const isAdmin = req.session.isTeam;
    const query = isAdmin ? {} : { public: true };
    const releases = await Release.find(query).sort({ timestamp: -1 });
    res.json({ success: true, releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

// Um die Detailansicht anzupassen:
app.get('/api/releases/:id', async (req, res) => {
  try {
    const isAdmin = req.session.isTeam;
    const release = await Release.findById(req.params.id);
    if (!release || (!release.public && !isAdmin)) {
      return res.status(404).send('Release not found');
    }
    res.json({ success: true, release });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).send('Server error, please try again later.');
  }
});

app.delete('/api/releases/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const result = await Release.deleteOne({ _id: id });
      if (result.deletedCount > 0) {
          res.json({ success: true });
      } else {
          res.json({ success: false, message: 'Release not found' });
      }
  } catch (error) {
      console.error('Error deleting release:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
