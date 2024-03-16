const mongoose = require("mongoose")
const plm = require("passport-local-mongoose")

// dot env
require('dotenv').config()

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((e) => {
    console.log("Couldn't connect to MongoDB", e);
  })


const userschema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  profilePicture: String,
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  joinedServers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'server'
  }],
  Requests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }]
})

userschema.plugin(plm)

module.exports = mongoose.model("user", userschema)