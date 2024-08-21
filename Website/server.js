const express = require('express');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path=require('path')
const User = require('./Model/User');
const Booking=require('./Model/Booking')
const { MongoClient } = require('mongodb');
const session = require("express-session");
const Razorpay = require('razorpay')
const QRCode = require('qrcode')
const twilio = require('twilio');


const accountSid = "Your SID";
const authToken = "Your Token";

app.use(session({
  secret: 'YOUR_SECRET',
  resave: false,
  saveUninitialized: true
}));

const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// connect to MongoDB database


mongoose.connect('mongodb://127.0.0.1:27017/parking', { useNewUrlParser: true });


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.render(__dirname + '/views/index');
  });
  app.get('/park', requireLogin,(req, res) => {
    const slots=[]
    Booking.find().exec((err,doc)=>{
    for(let i=0;i<doc.length;i++)
    {
      slots.push(
        doc[i].slot
       )
    }
    
    res.render(__dirname + '/views/Booking',{
      slots:slots,
      booking:doc
    });
    })
    
    
  });
  app.get('/login', (req, res) => {
    res.render(__dirname + '/views/Form');
  });
  app.get('/booking/:slot', (req, res) => {
    const slot=req.params.slot;
    req.session.slot=slot;
    res.render(__dirname + '/views/Booking Form');
  });
 
  app.get('/home', (req, res) => {
    var username = req.session.username || '';
    res.render(__dirname + '/views/home',{
      name:username
    });
  });
  app.get('/payment',(req,res)=>{
    res.render(__dirname + '/views/payment')
})
app.get('/success',(req,res)=>{
  res.render(__dirname + '/views/Success',{
    msg:req.session.msg
  })

})
 




// // use body-parser middleware to parse request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// route for handling form submission
app.post('/login', async (req, res) => {
  
    // validate input fields
    const { username, email, phone, password,action} = req.body;
    
    if(action=='Login')
    {
      console.log(username,password)
      User.findOne({ username },async (err, user) => {
        if(user)
        {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.log("Wrong Password");
          }
          else
          {
            req.session.userId=username;
        req.session.username=username;
        req.session.msg='Login Successful'
        res.redirect('/success')
        
        
          }
        }
      })
    }
    else
    {
      console.log(email)
      User.findOne({ email },async (err, user) => {
       
        if (user) 
        {
          // email address already exists
          console.log("Email already Exist")
        } 
        else 
        {
          console.log(password);
      const hashedPassword =  await bcrypt.hash(password, 10);
          
      // create new user object
      const user = new User({
        username,
        email,
        phone,
        password: hashedPassword
      });
  
      // save user to database
      user.save();
  
      // send success response
      res.redirect('/')
            }
          });
    }
    
   
      
    
    
   
  
});
app.post('/booking/*', (req, res) => {
  const { name, contact, plate, time } = req.body;
  console.log(name,contact,plate,time)
  const booking = new Booking({
    name,
    contact,
    number_plate:plate.toUpperCase(),
    time,
    slot:req.session.slot,
    isParked:false
  });

  // save user to database
  booking.save();
 
  const con=`+91${contact}`

  const client = new twilio(accountSid, authToken);
  client.messages.create({
    to: con, // recipient phone number
    from: '+15077044027', // Twilio phone number
    body: `Hello ${name} This is ParkXpert. Thank you for booking your parking slot with us. Your booking details are as follows:

    Location: https://goo.gl/maps/i7sj7ZCucUNMpyV77
    Parking Fee: 100rs per hour
    Note: Please arrive at the parking lot before 30 minutes past your booking time, otherwise your slot will be released.
    
    If you have any questions or concerns, please do not hesitate to contact us at ParkXpert website.
    
    Thank you for choosing ParkXpert, and have a great day!
    ` // message body
  }).then((message) => console.log(`Message sent with ID ${message.sid}`))
  .catch((error) => console.error(error));
  req.session.msg='Thanks For Booking !'
  res.redirect("/success")
});

    
    // const razorpayResponse = await razorpay.orders.create({ amount, currency: 'INR', payment_capture: 1 })
    // console.log(razorpayResponse)
    // // Generate a QR code for the transaction ID
    // const transactionId = razorpayResponse.id
    // console.log(transactionId)
    // console.log(payment)
    // const qrCode = await QRCode.toDataURL(order.id)
    // console.log(qrCode)
    // return res.json({ transactionId, qrCode })
 



// start server

 
    app.listen(3000, () => {
      console.log("Server is running on Port 3000");
    });
 

