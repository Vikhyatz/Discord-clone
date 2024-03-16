const mongoose = require("mongoose")

const serverschema = mongoose.Schema({
    serverName: String,
    serverIcon: String,
    serverOwner: String,
    channel: [{
        channelName: String,
        roomName: String
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
})

module.exports = mongoose.model("server", serverschema)