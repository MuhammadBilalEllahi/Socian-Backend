const crypto = require('crypto');
const router = require('express').Router();
const Emailed = require('./model/bounced.email');
const { resendEmailWhyAlumniReceivedEmailInUniversityEmail } = require('../utils/email.util');

// THIS IS TO CHEck that email was delievered ro uni email then why user said he is alumni
router.post('/email-events',async (req, res) => {
    const SIGNING_SECRET = process.env.RESEND_SIGNING_SECRET;
console.log('Received email event:', req.body);
  const signatureHeader = req.headers['resend-signature'];
  if (!signatureHeader) return res.status(400).send('Missing signature');

  const [timestampPart, signaturePart] = signatureHeader.split(',');
  const timestamp = timestampPart.split('=')[1];
  const signature = signaturePart.split('=')[1];

  const body = req.body.toString(); // convert Buffer to string

  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(body);
  if (event.type === 'delivered') {
    const { email, reason } = event.data;
    console.log(`Bounce detected: ${email} - ${reason}`);
    // Save to DB or notify user/admin

     const data = event.data;

      // Save to MongoDB
      await Emailed.create({
        email: data.to?.[0],
        reason: data.bounce?.message,
        type: data.bounce?.type,
        subType: data.bounce?.subType,
        subject: data.subject,
        emailId: data.email_id,
        receivedAt: new Date(data.created_at),
      });
    resendEmailWhyAlumniReceivedEmailInUniversityEmail({username: data.email_id, email: data.email.to?.[0]});

  }

  res.sendStatus(200);
});

module.exports = router;