const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channel: { type: String },
  evocati: { type: String },
  features: { type: [String] },
  bugFixes: { type: [String] },
  knownIssues: { type: [String] },
  timestamp: { type: Date, default: Date.now }
});

const Release = mongoose.model('Release', releaseSchema);

module.exports = Release;
