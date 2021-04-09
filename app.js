//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

//////////////////////////// DB setup ////////////////////////////
// connect with mongodb --> mongod --dbpath ~/data/db --> mongo
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = {
  email: String,
  password: String
};

const User = new mongoose.model("User", userSchema);

//////////////////////////// routes ////////////////////////////
app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

//////////////////////////// register a new user ////////////////////////////
app.post("/register", function(req, res) {

  User.findOne({email: req.body.username}, function(err, foundUser) {
    if (err) {
      console.log(err);
      res.render("upps", {message : "An error occured while fetching data from the DB."});
    } else {
      if(foundUser) {
        console.log("The user exists already.");
        res.render("upps", {message : "The user exists already."});
      } else {
        // create a new user
        const newUser = new User({
          email: req.body.username,
          password: req.body.password
        });

        // save the new user
        newUser.save(function(err) {
          if(err) {
            console.log(err);
            res.render("upps", {message : "An error occured while writing data to the DB."});
          } else {
            res.render("secrets");
          }
        });
      }
    }
  });
});

//////////////////////////// login the new user ////////////////////////////
app.post("/login", function(req, res) {

  User.findOne({email: req.body.username}, function(err, foundUser) {
    if (err) {
      console.log(err);
      res.render("upps", {message : "An error occured while fetching data from the DB."});
    } else {
      if (foundUser) {
        if (foundUser.password === req.body.password) {
          res.render("secrets");
        } else {
          console.log("Password incorrect");
          res.render("upps", {message : "Password incorrect"});
        }

      } else {
        console.log("No user found");
        res.render("upps", {message : "No user found"});
      }
    }
  });

});


//////////////////////////// Server ////////////////////////////
app.listen(port, () => console.log("Server started at port: "+ port));
