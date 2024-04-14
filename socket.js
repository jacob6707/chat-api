const { joinChannel, authenticate } = require("./util/socketEvents");
const User = require("./models/user");

let io;

module.exports = {
	init: (httpServer) => {
		io = require("socket.io")(httpServer, {
			cors: {
				origin: "*",
				method: ["GET, POST, PUT, PATCH, DELETE"],
				allowedHeaders: ["Content-Type, Authorization"],
			},
		});
		return io;
	},
	socketEvents: () => {
		io.use(authenticate).on("connection", (socket) => {
			socket.on("joinChannel", async ({ channelId }) => {
				await joinChannel(socket, channelId);
			});
			socket.on("leaveChannel", ({ channelId }) => {
				socket.to(channelId).emit("userLeft", {
					channel: channelId,
					user: socket.user._id.toString(),
				});
				socket.leave(channelId);
			});
			socket.on("disconnect", async () => {
				if (socket.user) {
					await User.findByIdAndUpdate(socket.user._id, {
						socketId: "",
						status: {
							current: "Offline",
							preferred: socket.user.status.preferred,
						},
					});
				}
			});
		});
		io.on("close", (event) => {
			console.log("WebSocket connection closed:", event);
		});
	},
	getIO: () => {
		if (!io) throw new Error("Socket.io not initialized");
		return io;
	},
};
