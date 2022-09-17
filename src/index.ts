/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import impact from './routes';
import pos from './routes/pos';
import posCache from './routes/posCache';
import pow from './routes/pow';
import powCache from './routes/powCache';

const app = express();

const whitelist: string[] = ['http://localhost:3000'];
const domains = ['.netlify.app', '.angle.money'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (whitelist.indexOf(origin) === -1) {
        for (const domain of domains) {
          if (origin.endsWith(domain)) return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    },
  })
);

/** Routes */
app.use('/v1', impact);
app.use('/v1/pow', pow);
app.use('/v1/pos', pos);
app.use('/v1/powCache', powCache);
app.use('/v1/posCache', posCache);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));
