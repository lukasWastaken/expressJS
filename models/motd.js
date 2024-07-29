const mongoose = require('mongoose');

const motdSchema = new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('motd', motdSchema);
