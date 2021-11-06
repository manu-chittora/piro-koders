/******************/
//REQUIREMENTS
/******************/
require("dotenv").config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const methodOverride = require('method-override');
/********************/
//DATABASE CONNECTION
/********************/
const mongoose = require('mongoose');

mongoose.connect(process.env.DBPATH, { useNewUrlParser: true,useUnifiedTopology: true, useCreateIndex: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', ()=>{
    console.log("Connected to db");
})
/******************/
//PRODUCT MODEL
/******************/
var productSchema= new mongoose.Schema({
    productname:String,
    category:String,
    brand:String,
    price:Number,
    uniquename:{type:String,unique:true}, 
    image:String,
    points:Number
});
var Product=mongoose.model("Product", productSchema);  
/******************/
//CITY MODEL
/******************/
var citySchema=new mongoose.Schema({
    cityname:String,
    latitude:Number,
    longitude:Number
})
var City=mongoose.model("City", citySchema);
/******************/
//USER MODEL
/******************/  
var UserSchema = new mongoose.Schema({
    fullname:String,
    username:String,
    password:String,
    profile:String,
    points:Number,
    city:String,
     latitude1:Number,
     longitude1:Number,
    purchased:[String]
}, {
    timestamps: true
})
UserSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", UserSchema);
/******************/
//OTHERS
/******************/
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));

app.use(require("cookie-session")({
    secret: "It is for users",
    resave: false,
    saveUninitialized: false
}));
/******************/
//PASSPORT CONFIG.
/******************/
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
/******************/
//CURRENT USER
/******************/
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});
/**********************/
//AUTHENTICATION ROUTES
/**********************/
app.get('/signup', (req, res) => {
    City.find({},function(err, all)
    {
        if(err)
        res.send("Error");
        else
        res.render("signup", {cities:all});
    });
})
app.post('/signup', (req, res) => {
    if(req.body.image.length==0)
    {
        req.body.image.length=(String)("https://i.ibb.co/YNzjt8X/Clipart-Key-1461473.png");
    }
   let currentcity=req.body.city; 
   let lat1="28.222222", long1="78.222222";  
   City.findOne({cityname:req.body.city},function(err,returnedcity)
    {
        if(err)
        {
            res.send("error");
            return res.redirect("/");
        }
        lat1=(returnedcity.latitude);
        long1=(returnedcity.longitude);
        console.log(lat1);
        var newUser = new User({username: req.body.username, fullname: req.body.name, points:0,city: req.body.city,latitude1:lat1, longitude1:long1, profile:req.body.image});
        User.register(newUser, req.body.password, (err, user) => {
            if(err)
            {
                console.log(err);
                return res.render("signup");
            }
            passport.authenticate('local')(req, res, ()=> {
                res.redirect('/');
            })
        })
    })
})
app.get('/login', (req, res) => {
    res.render("login");
})

app.post('/login', passport.authenticate('local',
    {
        successRedirect: '/',
        failureRedirect: '/login'
    }), (req, res) => {

    });

app.get('/logout', (req, res)=> {
    req.logout();
    res.redirect('/');
})
/***************/
//MAIN ROUTES
/***************/
app.get('/', (req, res) => {
    res.render("landing.ejs");
})
app.get("/products", function(req, res)
{
    Product.find({},function(err, all)
    {
        if(err)
        res.send("Error");
        else
        res.render("list.ejs", {products:all});
    });
});
app.get('/detect', isLoggedIn , (req, res) => {
    Product.find({},function(err, all)
    {
        if(err)
        res.send("Error");
        else
        res.render("detect", {products:all});
    });
})
app.post("/detect", (req, res)=>{
    Product.findOne({uniquename:req.body.uniquename},function(err, returned)
    {
        if(err){
            res.send("error");
            return res.redirect("/");
        }
        res.render("visited", {data:{returned:returned, mylatitude:req.body.mylatitude, mylongitude:req.body.mylongitude, distance:req.body.distance}});
    });
})
app.post("/addpoints", (req, res)=>{
    User.findOne({username:req.body.username}, function(err, user)
    {
        if(err){
            res.send("error");
            return res.redirect("/");
        }
        else 
        {
            if(user)
            {
                user.purchased.push(req.body.uniquename);
                user.points=(Number)(user.points)+(Number)(req.body.points);
                console.log(req.body.points);
                user.save(function()
                {
                    Product.findOne({uniquename:req.body.uniquename},function(err, returned)
                    {
                        if(err){
                                    res.send("error");
                                    return res.redirect("/");
                                }
                                res.redirect("/logout");
                    });
                })
            }
        }
    })
})
app.get("/profile/:username", function(req,res){
    User.findOne({username: req.params.username}, function(err,foundUser){
        if(err){
            return res.redirect("/");
        }
        res.render("profile",{user:foundUser});
    })
});
app.get("/check/:uniquename", isLoggedIn, function(req, res)
{
    Product.findOne({uniquename:req.params.uniquename},function(err, returned)
    {
        if(err){
            res.send("error");
            return res.redirect("/");
        }
        res.render("check", {returned:returned});
    });
});
app.get("/addnew", function(req, res)
{
    res.render("addnew");
});
app.post('/products', (req, res)=> {

    var productname=req.body.productname;
    var image=req.body.image;
    var points=req.body.points;
    var uniquename=req.body.uniquename;
    var brand =req.body.brand;
    var category =req.body.category;
    var price = req.body.price;
    console.log(productname);
    var newProduct = new Product({
        productname:productname,
        category:category,
        brand:brand,
        price:price,
        image:image, 
        points:points, 
        uniquename:uniquename
    });
    newProduct.save((err, returned)=> {
        if(err){
            res.send(err);
        } else{
            res.redirect("/products");
        }
    })
});
app.get("/products/:uniquename", function(req, res)
{
    Product.findOne({uniquename:req.params.uniquename}, function(err, pro)
    {
        if(err)
        res.send("Error");
        else
        res.render("showmore", {pro:pro});
    });
});
app.get("/leaderboard", function(req, res)
{
    User.find().sort({points:-1}).exec(function(err, alluser)
    {
        if(err)
        res.send("Error");
        else
        {
            City.find({},function(err, all)
            {
                if(err)
                res.send("Error");
                else
                res.render("leaderboard", {data:{allusers:alluser, cities:all}});
            });
            
        }
    });
});
app.get("/leaderboard/:city", function(req, res)
{

    User.find({city:req.params.city}).sort({points:-1}).exec(

        function(err, all)
        {
            var h=req.params.city;
            console.log(h);
            if(err)
            res.send("Error");
            else
            res.render("cityleaderboard", {home:h,allusers:all });
        });
})
/**************/
//MIDDLEWARE
/**************/
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/login');

}
/****************/
//SERVER STARTER
/****************/
const port = process.env.PORT || '3000'

app.listen(port, () => {
    console.log("Server started at 3000");
})