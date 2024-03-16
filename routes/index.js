var express = require('express');
var router = express.Router();
var userModel = require("./users")
var serverModel = require("./server")
var passport = require("passport")
const { v4: uuidv4 } = require('uuid');

var localStrategy = require('passport-local')
passport.use(new localStrategy(userModel.authenticate()))


router.get('/', function (req, res) {
  res.render('login');
});

router.post('/register', function (req, res) {
  const userData = new userModel({
    username: req.body.username,
    email: req.body.email
  })

  userModel.register(userData, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect('/profilepicture')
      })
    })
})

router.post('/login', passport.authenticate("local", {
  failureRedirect: "/login"
}), function (req, res) {
  res.redirect('/directMessage')
});

router.get('/register', function (req, res) {
  res.render('register')
})

// username check route to ensure new user does not keep the same username, usernames should be unique
router.get('/usernamecheck/:usernameInp', async function (req, res) {
  const usernameToCheck = req.params.usernameInp;

  const existingUser = await userModel.findOne({
    username: usernameToCheck
  });

  res.json(existingUser);
});


// profile picture route
router.get('/profilepicture', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })

  res.render('profilepicture', { user })
})

// update profile picture
router.post('/updateProfilePicture', async function (req, res) {
  try {
    const pfpUrl = req.body.url;
    console.log(pfpUrl)
    const myUserId = req.user._id;
    console.log(myUserId)

    const updatedUser = await userModel.findByIdAndUpdate(
      myUserId,
      { $set: { profilePicture: pfpUrl } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json('Profile picture set.');
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---



router.get('/directMessage', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('joinedServers friends')
  res.render('directMessage', { user })
})

router.get('/addFriends', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('joinedServers friends')
  res.render('addFriends', { user })
})

router.get('/createChannel', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })

  const serverId = req.query.serverid
  console.log(serverId)
  const server = await serverModel.findOne({ _id: serverId })

  res.render('createChannel', { user, server })
})

// post request to create a channel
router.post('/createChannel', isLoggedIn, async function (req, res) {
  // code to create the random roomname here from uuid
  const roomName = uuidv4();

  const userId = req.user._id
  const serverId = req.body.serverId
  const channelName = req.body.channelName
  console.log(serverId)

  await serverModel.findOneAndUpdate(
    { _id: serverId },
    {
      $push: {
        channel: {
          channelName: channelName,
          roomName: roomName
        },
      },
      $addToSet: {
        members: userId
      }
    }
  );


  res.redirect('/directMessage')
})

// post request to create server
router.post('/createserver', isLoggedIn, async function (req, res) {

  const user = await userModel.findOne({ username: req.session.passport.user })
  // code to create the random roomname here from uuid
  const roomName = uuidv4();
  const currentUserId = req.user._id

  console.log(currentUserId)

  const serverName = req.body.serverName
  const words = serverName.split(' ');
  const serverIcon = words.map(word => word.charAt(0)).join('');

  const newServer = await serverModel.create({
    serverName: serverName,
    serverIcon: serverIcon,
    serverOwner: req.user._id, // this will mark the current user as the owner of the server 
    channel: [{
      channelName: 'General',
      roomName: roomName
    }],
    members: []
  });

  newServer.members.push(currentUserId._id);
  user.joinedServers.push(newServer._id);

  await user.save()
  await newServer.save()

  res.redirect('/directMessage')
})

router.get('/createServer', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  res.render('createServer', { user })
})

router.get('/requests', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('Requests')
  res.render('requests', { user })
})

router.get('/invite', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('Requests')

  let serverId = req.query.serverId
  console.log(serverId)
  const server = await serverModel.findOne({ _id: serverId })
  console.log(server)

  res.render('invite', { user, server })
})

router.post('/acceptInvite', isLoggedIn, async function (req, res) {

  let serverId = req.body.serverId
  let userId = req.user._id
  const server = await serverModel.findOne({ _id: serverId })
  console.log(userId)
  console.log(server)

  const serverAccept = await userModel.findByIdAndUpdate(
    userId,
    { $addToSet: { joinedServers: server._id } },
    { new: true }
  );

})


router.get('/settings', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  res.render('settings', { user })
})

router.get('/server', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('joinedServers')

  const serverId = req.query.id
  console.log(serverId)

  const server = await serverModel.findOne({ _id: serverId })

  res.render('server', { user, server })
})


router.get('/channel', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('joinedServers')

  const channelId = req.query.channelid
  const serverId = req.query.serverid
  console.log(serverId)
  console.log(channelId)

  const server = await serverModel.findOne({ _id: serverId })

  res.render('channel', { user, server, channelId, serverId })
})

// route to get the channel info
router.get('/channel/:channelId/:serverId', isLoggedIn, async function (req, res) {
  const channelId = req.params.channelId
  const serverId = req.params.serverId
  console.log(channelId)
  console.log(serverId)

  const server = await serverModel.findOne({ _id: serverId });

  const channel = server.channel.find(c => c._id.toString() === channelId);

  res.json(channel)
})

// route with post method to send and save the request in the reciever users requests collection  
router.post('/sendFriendRequest', isLoggedIn, async function (req, res) {
  const friendName = req.body.friendName
  const senderId = req.user._id

  // Check if friendName exists in the userModel
  const receiver = await userModel.findOne({ username: friendName });



  if (!receiver) {
    // user with friendName doesn't exist
    res.json({ message: 'Wrong Username, try again!!' });
  }
  if (receiver._id.toString() === senderId.toString()) {
    // if the user is trying to send himself the request
    return res.json({ message: 'I anticipated this, you cannot send request to yourself bruh..' });
  }
  else {

    // User exists, so add senderId to receiver's Requests
    const request = await userModel.findByIdAndUpdate(
      receiver._id,
      { $addToSet: { Requests: senderId } },
      { new: true }
    );

    res.json({ message: 'Request Sent!!' });
  }
});

// route to accept sender Request:

// 1. accept Request
router.post('/acceptRequest/:senderId', isLoggedIn, async function (req, res) {
  const senderId = req.params.senderId
  const currentUserId = req.user._id

  // add friends in both the arrays of friends in both the ID's
  await userModel.findByIdAndUpdate(senderId, { $addToSet: { friends: currentUserId } });
  await userModel.findByIdAndUpdate(currentUserId, { $addToSet: { friends: senderId } });

  // delete the request
  await userModel.findByIdAndUpdate(currentUserId, { $pull: { Requests: senderId } });
})


// 2. decline Reqeust
router.post('/declineRequest/:senderId', isLoggedIn, async function (req, res) {
  const senderId = req.params.senderId
  const currentUserId = req.user._id

  // delete the request
  await userModel.findByIdAndUpdate(currentUserId, { $pull: { Requests: senderId } });
})

// ---

router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

router.get('/allusers', async function (req, res) {
  let allusers = await userModel.find().populate('joinedServers')
  res.send(allusers)
})

router.get('/servers', async function (req, res) {
  let allusers = await serverModel.find().populate('members')
  res.send(allusers)
})

router.get('/deleteServers', async function (req, res) {
  let deleteduser = await serverModel.deleteMany()
  res.send(deleteduser)
})

router.get('/deleteall', async function (req, res) {
  let deleteduser = await userModel.deleteMany()
  res.send(deleteduser)
})


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.redirect("/")
}

module.exports = router;
