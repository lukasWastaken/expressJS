const mongoose = require('mongoose');

const motdSchema = new mongoose.Schema({
  text: { type: String, required: true }
});

module.exports = mongoose.model('motd', motdSchema);
