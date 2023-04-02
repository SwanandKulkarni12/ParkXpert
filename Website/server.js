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


const accountSid = 'ACc65ef3a0ed84d614bc4d414f4ef90a3a';
const authToken = '226594c79d533948aa1f6c3480053288';

app.use(session({
  secret: '2fbe9e214d66b79e27931002fcec9d879f77c14ea82e3c8ac929e523384ad2ff17d57bed5cafa4f8d26c4d6ca6d0fb1eb3d0a9d8311578eba47cec01b4b72deb',
  resave: false,
  saveUninitialized: true
}));
const razorpay = new Razorpay({
  key_id: 'rzp_test_SrDUZ6lNE3EYKI',
  key_secret: 'Dx3WEoYGOYQAGAFllFzhni5r',
})
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
app.post('/create_transaction', async (req, res) => {
  
    // Create a test transaction with Razorpay
    const {amount,name,email,contact}=req.body;
    let cust_id;
    razorpay.customers.create({
      name: name,
      contact: 9975836089,
      email: "swanandkulkarni272@gmail.com",
      fail_existing: 0,
      notes: {
        notes_key_1: "Tea, Earl Grey, Hot",
        notes_key_2: "Tea, Earl Grey… decaf."
      }
    }).then(res=>{
      console.log(res)
      razorpay.qrCode.create({
  type: "upi_qr",
  name: "Store Front Display",
  usage: "single_use",
  fixed_amount: true,
  payment_amount: amount*100,
  description: "For Store 1",
  customer_id: res.id,
  close_by: 1681615838,
  notes: {
    purpose: "Test UPI QR Code notes"
  }
}, function (error, response) {
  if (error) {
    console.error(error);
  } else {
    console.log(response);
  }
})
    })
    

      
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
 


app.post('/verify_transaction', async (req, res) => {
  try {
    // Retrieve the transaction details from Razorpay
    const transactionId = req.body.transactionId
    const razorpayResponse = await razorpay.orders.fetch(transactionId)

    // Verify the transaction details
    if (razorpayResponse.amount === req.body.amount && razorpayResponse.status === 'captured') {
      // Transaction is successful
      return res.json({ message: 'Transaction successful' })
    } else {
      // Transaction failed
      return res.status(400).json({ message: 'Transaction failed' })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
// start server

 
    app.listen(3000, () => {
      console.log("Server is running on Port 3000");
    });
 

