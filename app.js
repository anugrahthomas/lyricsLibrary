const express = require("express");
const app = express();
const fs = require("fs");

const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const port = 3000;
let adminIs = false;
const db = require("./config/dbConnection");
const userModel = require("./models/userModel");
const songModel = require("./models/songModel");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

//   const password = "Anugrahadmin123";

app.get("/", async (req, res) => {
  const findSong = await songModel.find();
  res.render("index", { songs: findSong });
}); 

app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userFind = await userModel.findOne({ username: username });
  if (userFind && !userFind.isAdmin) {
    bcrypt.compare(password, userFind.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ userId: userFind._id }, "secretkey");
        res.cookie("token", token);
        res.redirect("/create");
      } else {
        res.redirect("/login");
      }
    });
  } else if (userFind && userFind.isAdmin) {
    bcrypt.compare(password, userFind.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ userId: userFind._id }, "secretkey");
        res.cookie("token", token);
        adminIs = true;
        res.redirect("/admin");
      } else {
        res.redirect("/login");
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/create", isLoggedIn, (req, res) => {
  res.render("create");
});
app.post("/create", isLoggedIn, async (req, res) => {
  const { title, song } = req.body;
  const userFind = await userModel.find({ _id: req.user.userId });
  const songFind = await songModel.find({ title: title });
  if (songFind.length > 0) {
    res.send("Exist");
  } else if (title) {
    const t = title.replaceAll(" ", "").toLowerCase();
    const songCreated = await songModel.create({
      title: title,
      filename: `${t}.txt`,
      createdBy: req.user.userId,
    });

    fs.writeFile(`./files/${t}.txt`, song, (err) => {
      console.error(err);
    });
    userFind[0].songsCreated.push(songCreated._id);
    await userFind[0].save();
    res.redirect("/create");
    // res.redirect(`/song/${songCreated._id}`)
  } else {
    res.send("Something went wrong");
  }
});
app.get("/logout", isLoggedIn, (req, res) => {
  res.cookie("token", "");
  adminIs = false;
  res.redirect("/");
});
app.get("/song/:sid", async (req, res) => {
  const songFind = await songModel.findOne({ _id: req.params.sid });
  if (songFind) {
    fs.readFile(`./files/${songFind.filename}`, "utf-8", (err, data) => {
      res.render("song", { title: songFind.title, data: data });
    });
  } else {
    res.redirect("/");
  }
});

app.get("/admin", isLoggedIn, isadmin, async (req, res) => {
  const userFind = await userModel.find();
  const songFind = await songModel.find();
  res.render("admin", { users: userFind, songs: songFind });
});

app.get("/signup", isLoggedIn, isadmin, (req, res) => {
  res.render("signup");
});
app.post("/signup", isLoggedIn, isadmin, async (req, res) => {
  // login and admin
  const { username, name, password } = req.body;
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const userCreate = await userModel.create({
        name,
        username,
        password: hash,
      });
      res.redirect("/admin");
    });
  });
});

app.get("/delete/:id", isLoggedIn, isadmin, async (req, res) => {
  // login and admin
  const userFind = await userModel.findOne({ _id: req.params.id });
  const adminFind = await userModel.findOne({ _id: req.user.userId });
  const arr = userFind.songsCreated;
  arr.forEach((e) => adminFind.songsCreated.push(e));
  await adminFind.save();
  await songModel.findOneAndUpdate(
    { createdBy: req.params.id },
    { createdBy: req.user.userId },
    { new: true }
  );
  await userModel.findOneAndDelete({ _id: req.params.id });
  res.redirect("/admin");
});

app.get("/remove/:sid", isLoggedIn, isadmin, async (req, res) => {
  const songFind = await songModel.findOne({ _id: req.params.sid });
  fs.unlink(`./files/${songFind.filename}`, (err) => {
    console.error(err);
  });
  const userFind = await userModel.findOne({ _id: songFind.createdBy });
  const index = userFind.songsCreated.indexOf(req.params.sid);
  userFind.songsCreated.splice(index, 1);
  await userFind.save();
  await songModel.findOneAndDelete({ _id: req.params.sid });
  res.redirect("/admin");
});

function isadmin(req, res, next) {
  if (!adminIs) {
    res.redirect("/create");
  } else {
    next();
  }
}

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (token === "") {
    res.redirect("/login");
  } else {
    const data = jwt.verify(token, "secretkey");
    req.user = data;
    next();
  }
}
app.listen(port, () => {
  console.log("Listening");
});
