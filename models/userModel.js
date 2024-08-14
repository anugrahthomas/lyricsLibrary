const { name } = require("ejs");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  isAdmin: {
    type: Boolean,
    default: false,
  },
  songsCreated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:'song',
    default: [],
  }],
});

module.exports = mongoose.model("user", userSchema);
