const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  filename: String,
});

module.exports = mongoose.model("song", songSchema);
