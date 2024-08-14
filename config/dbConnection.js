const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/songdb")
  .then(() => {
    console.log("connected");
  }).catch((err) => {
    console.error(err);
  });

module.exports = mongoose.connections;
