const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./models/User');
const MOTD = require('./models/motd');
const Release = require('./models/Release'); // Neues Modell

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

app.get('/api/releases', async (req, res) => {
  try {
    const releases = await Release.find().sort({ timestamp: -1 });
    res.json({ success: true, releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.get('/api/releases/:id', async (req, res) => {
  try {
    const release = await Release.findById(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    res.json({ success: true, release });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* Game Files */
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
  console.log('Server is running on port 3000');
});