const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        exec('git pull origin master && npm install && pm2 restart my-express-app', (err, stdout, stderr) => {
            if (err) {
                console.error(`exec error: ${err}`);
                res.writeHead(500);
                res.end('Error');
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            res.writeHead(200);
            res.end('Deployed successfully');
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(3001, () => {
    console.log('Deployment server listening on port 3001');
});
