const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();

mongoose.connect('mongodb://localhost:27017/squaresphere', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/register', async (req, res) => {
  const { username, password, accessLevel } = req.body;
  const user = new User({ username, password, accessLevel });
  await user.save();
  res.send('Account successfully registered');
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

    res.json({ success: true, accessLevel: user.accessLevel });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
});

app.listen(3003, () => {
  console.log('Auth Server running on http://localhost:3003');
});
