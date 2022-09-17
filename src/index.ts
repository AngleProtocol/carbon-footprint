/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import express from 'express';

import impact from './routes';
import cache from './routes/cache';
import pos from './routes/pos';
import pow from './routes/pow';

const app = express();

/** Routes */
app.use('/v1', impact);
app.use('/v1/pow', pow);
app.use('/v1/pos', pos);
app.use('/v1/cache', cache);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));
