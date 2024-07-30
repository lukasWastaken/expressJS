// models/Release.js
const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channel: { type: String, required: true, enum: ['live', 'test', 'tech-preview'] },
  evocati: { type: Boolean, required: true },
  features: { type: String, required: true },
  bugFixes: { type: String, required: true },
  knownIssues: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Release', releaseSchema);
