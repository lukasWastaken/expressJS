const express = require('express');
const path = require('path');

const app = express();

app.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const options = {
    root: path.join(__dirname, 'files'),
    headers: {
      'Content-Disposition': `attachment; filename=${filename}`
    }
  };

  res.sendFile(filename, options, (err) => {
    if (err) {
      if (err.code === ':ECONNABORTED' || err.code === 'ECONNRESET') {
        console.warn('Client aborted the download request');
      } else {
        console.error('Error sending file:', err);
        res.status(404).send('File not found');
      }
    }
  });
});

app.listen(3002, () => {
  console.log('File Server running on http://localhost:3002');
});
