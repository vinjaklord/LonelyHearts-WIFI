import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
import router from './routes/router.js';

import HttpError from './models/http-error.js';

const PORT = process.env.PORT || 5000;
const CONNECTION_STRING = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@wifi-fullstack.3safp.mongodb.net/lonelyhearts?retryWrites=true&w=majority`;

const app = express();
// Middlewares
app.use(cors());
app.use(helmet());

// Form body parser

app.use(express.urlencoded({ extended: true }));
// JSON parser

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to Lonely Hearts!');
});

// All other routes

app.use('/api', router);
// Show error when the route isnt found
app.use((req) => {
  throw new HttpError('Could not find route: ' + req.originalUrl, 404);
});

// Central error handling

app.use((error, req, res, next) => {
  if (res.headerSent) {
    // if a header is uploaded, sending no response and just continue  and no other will be uploaded
    return next(error);
  }
  const { errorCode, message } = error;
  res.status(errorCode).json({ message });
});

// MongoDB connection

mongoose
  .connect(CONNECTION_STRING)
  .then((data) => {
    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
