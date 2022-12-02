require("dotenv").config();

const express = require("express");
const http = require("http");
const app = express();
const PORT = process.env.PORT || 8000;
const connectToDB = require("./DB/mongoConnect");
const cors = require("cors");
const bodyParser = require("body-parser");
const initRoutes = require("./main.routes");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
const fs = require("fs");
const { truncate } = require("lodash");

/* ----------------------LOADING ALL MODELS BEFORE TO ESTABLISH REFRERENCING ------------*/
var models_path = __dirname + "/Models";

fs.readdirSync(models_path).forEach(function (file) {
  if (~file.indexOf(".js")) require(models_path + "/" + file);
});
/* --------------------------------------------------------------------------------*/
// export const httpsServer = https.createServer(
//     {
//         key: fs.readFileSync("path to private key"),
//         cert: fs.readFileSync(
//           "path to fullChain key"
//         ),
//       },
//       app
// )
const httpsServer = http.createServer(app);

app.get("/", (req, res) => res.send("server connected"));
httpsServer.listen(PORT, async () => {
  try {
    // connecting to db
    await connectToDB();
    // initializing APIs
    initRoutes(app);
  } catch (err) {
    console.error(err);
  }
});

//  Configuring and connecting Socket on server
let io = require("socket.io")(httpsServer, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
  },
});

// Run when client connects
io.on("connection", (socket) => {
  console.log(`Connected to socket.io with socket id: ${socket.id}`);
  //console.log(`Connected to socket.io`);

  // Broadcast when a user connects
  socket.broadcast.emit("message", "A user has joined the Chat");

  //let chat = db.collection("Chat");

  //  user data send from front end while joining to chat
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(userData._id);
    socket.emit("user connected");
  });

  // Room created when joined chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);

    // Welcome current user
    socket.emit("message", `Welcome to ${process.env.CHAT_NAME}`);
    console.log(`Welcome to ${process.env.CHAT_NAME}`);
  });

  // user typing event
  socket.on("typing", (room) => socket.in(room).emit("typing"));

  // user stop typing
  socket.on("Stop typing", (room) => socket.in(room).emit("Stop typing"));

  // New Chat message

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;
    if (!chat.users) return console.log("chat users not defined");
    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.semder._id) return;
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  //Get Chat from mongodb collection
  //   chat
  //     .find()
  //     .limit(50)
  //     .sort({ _id: 1 })
  //     .toArray((err, res) => {
  //       if (err) {
  //         throw err;
  //       }

  //       // Emit the messages.
  //       socket.emit("output", res);
  //     });

  // Create function to send status
  sendStatus = (s) => {
    socket.emit("status", s);
  };

  // Handle input events
  socket.on("input", (data) => {
    let name = data.name;
    let message = data.message;

    // check for name and message
    if (name == "" || message == "") {
      // Send error status
      sendStatus("Please enter a name and message");
    } else {
      // Insert message
      chat.insert({ name: name, message: message }, () => {
        io.emit("output", [data]);

        // Send status object
        sendStatus({
          message: "Message sent",
          clear: true,
        });
      });
    }
  });

  // User Disconnected
  socket.on("disconnect", () => {
    console.log(`A user has left the chat. socketid: ${socket.id}`);
  });

  // Handle clear
  socket.on("clear", (data) => {
    // Remove all chats from collection
    chat.remove({}, () => {
      // Emit cleared
      socket.emit("cleared");
    });
  });

  socket.off("setup", () => {
    console.log("User Disconnected");
    socket.leave(userData._id);
  });
});
const socketIoObject = io;
module.exports.ioObject = socketIoObject;
