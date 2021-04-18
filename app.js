//jshint esversion:6

// Environment variables
require("dotenv").config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook");

const app = express();

const port = process.env.PORT || 3000;

// Usage of the environment variables
//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

// https://www.npmjs.com/package/express-session
app.use(session({
  secret: "This is a very short long sentence.",
  resave: false,
  saveUninitialized: false
}));

// http://www.passportjs.org/docs/configure/
app.use(passport.initialize());
app.use(passport.session());

// https://www.npmjs.com/package/passport-local-mongoose

//////////////////////////// DB setup ////////////////////////////
// connect with mongodb --> mongod --dbpath ~/data/db --> mongo
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

// To solve the DeprecationWarning "collection.ensureIndex is deprecated. Use createIndexes instead"
mongoose.set("useCreateIndex", true);

// mongoose schema is required for the encryption: https://preview.npmjs.com/package/mongoose-encryption
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

// Mongoose plugin: https://mongoosejs.com/docs/plugins.html
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//////////////////////////// Google OAuth ////////////////////////////
// The google+ API is deprecated:
//see issue #50 on github.com/jaredhanson/passport-google-oauth2.git
// --> https://github.com/jaredhanson/passport-google-oauth2/pull/51
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    // findOrCreate is not provided by mongoose directly: https://preview.npmjs.com/package/mongoose-findorcreate
    User.findOrCreate({ googleId: profile.id, username: profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

//////////////////////////// facebook OAuth ////////////////////////////
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ facebookId: profile.id, username: profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

//////////////////////////// routes ////////////////////////////
app.get("/", function(req, res) {
  res.render("home");
});

//////////////////////////// Google OAuth ////////////////////////////
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"]})
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

//////////////////////////// Google OAuth ////////////////////////////
app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/submit", function(req, res) {

  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }

});

app.get("/logout", function(req, res) {

  // end current session and redirect
  req.logout();
  res.redirect("/");

});

app.get("/secrets", function(req, res) {

  if (req.isAuthenticated()) {

    // find all secrets of all users
    //$ne: null --> not equal to null
    User.find({secret: {$ne: null}}, function(err, foundUsers) {
      if (err) {
        console.log(err);
        res.render("upps", {message : err});
      } else {
        if (foundUsers) {
          console.log(foundUsers);
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });

  } else {
    res.redirect("/login");
  }

});

//////////////////////////// register a new user ////////////////////////////
app.post("/register", function(req, res) {

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

  // User.findOne({email: req.body.username}, function(err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //     res.render("upps", {message : "An error occured while fetching data from the DB."});
  //   } else {
  //     if(foundUser) {
  //       console.log("The user exists already.");
  //       res.render("upps", {message : "The user exists already."});
  //     } else {
  //       // create a new user
  //
  //       // creat hash to store in DB
  //       bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //         // Store hash in your password DB.
  //         if (err) {
  //           console.log(err);
  //           res.render("upps", {message : "An error occured while hashing your password."});
  //         } else {
  //           console.log(hash);
  //
  //           const newUser = new User({
  //             email: req.body.username,
  //             password: hash
  //           });
  //
  //           // save the new user
  //           newUser.save(function(err) {
  //             if(err) {
  //               console.log(err);
  //               res.render("upps", {message : "An error occured while writing data to the DB."});
  //             } else {
  //               res.render("secrets");
  //             }
  //           });
  //         }
  //       });
  //     }
  //   }
  // });

});

//////////////////////////// login the new user ////////////////////////////
app.post("/login", function(req, res) {

  const user = new User ({
    username: req.body.username,
    password: req.body.password
  });

  // use passport to login the user:
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(err) {
        res.redirect("/secrets");
      });
    }

  });


  // User.findOne({email: req.body.username}, function(err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //     res.render("upps", {message : "An error occured while fetching data from the DB."});
  //   } else {
  //     if (foundUser) {
  //
  //       // Load hash from your password DB.
  //       bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
  //         // result == true
  //         if (err) {
  //           console.log(err);
  //           res.render("upps", {message : "Something went wrong, try again later."});
  //         } else {
  //           if (result === true) {
  //             res.render("secrets");
  //           } else {
  //             console.log("Password incorrect");
  //             res.render("upps", {message : "Password incorrect"});
  //           }
  //         }
  //
  //       });
  //
  //
  //
  //
  //     } else {
  //       console.log("No user found");
  //       res.render("upps", {message : "No user found"});
  //     }
  //   }
  // });

});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;
  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
      res.render("upps", {message : err});
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });

});

//////////////////////////// Server ////////////////////////////
app.listen(port, () => console.log("Server started at port: "+ port));
