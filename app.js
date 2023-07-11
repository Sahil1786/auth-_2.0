require('dotenv').config();

const express=require("express");
const bodyparser=require("body-parser");
const ejs =require("ejs");
const mongoose=require("mongoose");

const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const  findOrCreate = require('mongoose-findorcreate');


 



const app=express();


app.set('view engine','ejs');
app.use(bodyparser.urlencoded({
    extended:true
}));


app.use(express.static("public"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  
  }));








mongoose.connect("mongodb://127.0.0.1:27017/userDB").then(()=>{
    console.log("Db connected..")


})
.catch((err)=>{
    console.log(err)
  })
  ;

  app.use(passport.initialize());
  app.use(passport.session());
//   mongoose.set("useCreateIndex",true);

/// for encrypion part
  const userSchema= new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);


  //before add this  to carete model need to plug in
  

  const user=new mongoose.model("user",userSchema);

  passport.use(user.createStrategy());

  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


  //google auth
  passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
     userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    user.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })   // google startygy

);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret page .
    res.redirect("/secrets");
  });


app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});


app.get("/secrets",function(req,res){
 user.find({"secret" : {$ne:null}}).then((foundUser)=>{
    if(foundUser){
        res.render("secrets",{userWithSecrets:foundUser});

      
        
    
    }
 })
 .catch((err)=>{
    console.log(err)
  })
 
})

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("login");
    }
});



app.get("/logout", function(req,res){
    req.logout((err)=>{
if(err){
    console.log(err);
}
    });
    res.redirect("/");

})

app.post("/register",function(req,res){
    user.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){   //if varify
                res.redirect("/secrets");
            })
        }
    })

});


app.post("/login",function(req,res){
 const User = new user({
    username:req.body.username,
    password:req.body.password
  });
  req.login(User,function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local")(req,res,function(){   //if varify
            res.redirect("/secrets");
        });
    }
  });
});


app.post("/submit",function(req,res){
    const submittedSecret=req.body.secret;

 console.log(req.user.id);//register user tkae
 user.findById(req.user.id).then((foundUser)=>{
    if(foundUser){
foundUser.secret=submittedSecret;
foundUser.save().then(()=>{
res.redirect("/secrets");
});

        
    };
    
    
 });


});


app.listen(3000,function(req,res){
    console.log("Server is on running port 3000");
});




