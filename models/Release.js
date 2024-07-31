const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channel: { type: String },
  public: { type: Boolean, default: false },
  features: { type: [String] },
  bugFixes: { type: [String] },
  knownIssues: { type: [String] },
  timestamp: { type: Date, default: Date.now }
});

const Release = mongoose.model('Release', releaseSchema);

module.exports = Release;
