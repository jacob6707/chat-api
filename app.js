const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const channelsRoutes = require("./routes/channels");
const { joinChannel } = require("./util/socketEvents");

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = process.env.MONGODB_ENDPOINT;

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
	.then((connection) => {
		const server = app.listen(PORT, () => {
			console.log(`Server listening on port ${PORT}`);
		});
		const io = require("./socket").init(server);
		io.on("connection", (socket) => {
			socket.on("joinChannel", ({ token, channelId }) => {
				joinChannel(socket, token, channelId);
			});
			socket.on("leaveChannel", ({ channelId }) => {
				socket.leave(channelId);
				console.log(`User left channel ${channelId}`);
			});
		});
	})
	.catch((err) => {
		console.log(err);
	});
