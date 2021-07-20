//require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt  = require("mongoose-encryption");
//const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRound = 10;
const session = require("express-session");
const passport = require("passport");
const passportlocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyparser.urlencoded({extended:true}));

app.use(session({
    secret: "my little paaword.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost/userDB",{useNewUrlParser:true , useUnifiedTopology:true});

const userschema = new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    secret:String
});

userschema.plugin(passportlocalMongoose);
userschema.plugin(findOrCreate);
//userschema.plugin(encrypt,{secret:process.env.SECRET, excludeFromEncryption:["username"]});

const User = mongoose.model("User", userschema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secret", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secret");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

app.get("/secret",function(req,res){
   User.find({secret: {$ne: null}}, function(err,result){
       if(err){
           console.log(err);
       }else{
           if(result){
               res.render("secrets", {secrets : result})
           }
       }
   })
});

app.get("/submit", function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req,res){
    // bcrypt.hash(req.body.password,saltRound,function(err,hash){
    //     const user  = new User({
    //         username:req.body.username,
    //         password:hash
    //     });
    //     user.save(function(err){
    //         if(!err){
    //             res.render("secrets");
    //         }else{
    //             res.send(err);
    //         }
    //     });
    // }); 

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secret");
            })
        }
    })
});

app.post("/login",function(req,res){
    // const username = req.body.username;
    // const password = req.body.password;
    // User.findOne({username:username},function(err,result){
    //     if(!err){
    //        bcrypt.compare(password,result.password,function(err,resultb){
    //         if(resultb == true){
    //             res.render("secrets");
    //         }
    //        })
    //     }else{
    //         res.render(err);
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secret");
            })
        }
    })
});

app.post("/submit", function(req,res){
    const secret = req.body.secret;
    User.findById(req.user.id, function(err, result){
        if(err){
            console.log(err);
        }else{
            if(result){
                result.secret = secret;
                result.save(function(){
                    res.redirect("/secret");
                });
            }
        }
    });
});

app.listen(3000,function(req,res){
    console.log("localhost 3000 connecion succefully");
});