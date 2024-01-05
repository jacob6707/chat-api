const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

require('dotenv').config();

const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = process.env.MONGODB_ENDPOINT;

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(MONGODB_ENDPOINT)
  .then((connection) => {
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
