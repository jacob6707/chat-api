const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const PORT = process.env.PORT || 8080;

const app = express();
app.use(bodyParser.json());

app.use(cors());

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
});

const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
