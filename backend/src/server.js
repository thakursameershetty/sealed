const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Verify dependencies
exec('yt-dlp --version', (err) => {
    if (err) console.error('yt-dlp not found. Please install it.');
    else console.log('yt-dlp is installed.');
});

exec('ffmpeg -version', (err) => {
    if (err) console.error('ffmpeg not found. Please install it.');
    else console.log('ffmpeg is installed.');
});

app.post('/api/download', (req, res) => {
    const { url, format } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const id = uuidv4();
    const ext = format === 'audio' ? 'mp3' : 'mp4';
    const outputPath = path.join('/tmp', `${id}.${ext}`);

    let args = [];
    if (format === 'audio') {
        args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputPath, url];
    } else {
        // default to video: force mp4 video and m4a audio for native player compatibility 
        args = ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4', '-o', outputPath, url];
    }

    try {
        const ytdlp = spawn('yt-dlp', args);

        ytdlp.on('close', (code) => {
            if (code !== 0) {
                console.error(`yt-dlp process exited with code ${code}`);
                return res.status(400).json({ error: 'Failed to download or invalid URL/age restricted.' });
            }

            res.download(outputPath, `download.${ext}`, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                // Cleanup immediately
                fs.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr) console.error(`Failed to delete ${outputPath}:`, unlinkErr);
                    else console.log(`Deleted ${outputPath}`);
                });
            });
        });

        ytdlp.on('error', (err) => {
            console.error('Failed to start yt-dlp:', err);
            return res.status(500).json({ error: 'Server configuration error' });
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
