//jshint esversion:6

// Environment variables
require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

const port = process.env.PORT || 3000;

// Usage of the environment variables
//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

//////////////////////////// DB setup ////////////////////////////
// connect with mongodb --> mongod --dbpath ~/data/db --> mongo
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

// mongoose schema is required for the encryption: https://preview.npmjs.com/package/mongoose-encryption
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

// Mongoose plugin: https://mongoosejs.com/docs/plugins.html
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

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

app.get("/logout", function(req, res) {
  res.render("home");
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

        // creat hash to store in DB
        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
          // Store hash in your password DB.
          if (err) {
            console.log(err);
            res.render("upps", {message : "An error occured while hashing your password."});
          } else {
            console.log(hash);

            const newUser = new User({
              email: req.body.username,
              password: hash
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

        // Load hash from your password DB.
        bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
          // result == true
          if (err) {
            console.log(err);
            res.render("upps", {message : "Something went wrong, try again later."});
          } else {
            if (result === true) {
              res.render("secrets");
            } else {
              console.log("Password incorrect");
              res.render("upps", {message : "Password incorrect"});
            }
          }

        });




      } else {
        console.log("No user found");
        res.render("upps", {message : "No user found"});
      }
    }
  });

});


//////////////////////////// Server ////////////////////////////
app.listen(port, () => console.log("Server started at port: "+ port));
