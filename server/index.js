import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import monthsRouter from './routes/months.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use('/api/months', monthsRouter);

app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// API_PORT takes priority so local dev doesn't collide with the frontend dev
// server's PORT (Railway/production only ever sets PORT, not API_PORT).
const port = process.env.API_PORT || process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
