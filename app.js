const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const channelsRoutes = require("./routes/channels");
const { joinChannel } = require("./util/socketEvents");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = process.env.MONGODB_ENDPOINT;

// check if public/attachments and public/avatars exist
const attachmentsDir = path.join(__dirname, "public", "attachments");
const avatarsDir = path.join(__dirname, "public", "avatars");
try {
	if (!fs.existsSync(path.join(__dirname, "public"))) {
		fs.mkdirSync(path.join(__dirname, "public"));
	}
	if (!fs.existsSync(attachmentsDir)) {
		fs.mkdirSync(attachmentsDir);
	}
	if (!fs.existsSync(avatarsDir)) {
		fs.mkdirSync(avatarsDir);
	}
} catch (err) {
	console.log(err);
}

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/channels", channelsRoutes);

app.use((error, req, res, next) => {
	console.log(error);
	const status = error.statusCode;
	const message = error.message;
	const data = error.data;
	return res.status(status).json({ message: message, data: data });
});

mongoose
	.connect(MONGODB_ENDPOINT)
	.then(() => {
		const server = app.listen(PORT, () => {
			console.log(`Server listening on port ${PORT}`);
		});
		const io = require("./socket").init(server);
		require("./socket").socketEvents();
	})
	.catch((err) => {
		console.log(err);
	});
