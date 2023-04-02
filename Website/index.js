const Razorpay = require('razorpay')
const QRCode = require('qrcode')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()

// Initialize the Razorpay client with test keys
const razorpay = new Razorpay({
  key_id: 'rzp_test_SrDUZ6lNE3EYKI',
  key_secret: 'Dx3WEoYGOYQAGAFllFzhni5r',
})

app.use(bodyParser.json())
app.set('views', path.join(__dirname, 'views'));
app.get('/',(req,res)=>{
    res.sendFile('payment.html')
})
app.post('/create_transaction', async (req, res) => {
  try {
    // Create a test transaction with Razorpay
    const amount = req.body.amount
    const razorpayResponse = await razorpay.orders.create({ amount, currency: 'INR', payment_capture: 1 })

    // Generate a QR code for the transaction ID
    const transactionId = razorpayResponse.id
    const qrCode = await QRCode.toDataURL(transactionId)
    
    return res.json({ transactionId, qrCode })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

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

app.listen(3000, () => {
  console.log('Server started on port 3000')
})
