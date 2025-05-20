const resendProt = require("resend");
const { createDateTime } = require("./utils");
const { Resend } = resendProt;
const resend = new Resend(process.env.resend);

const resendEmail = async (datas, req, res) => {
  try {
    // console.log(datas);
    const { data, error } = await resend.emails.send({
      from: "no-reply@bilalellahi.com",
      to: [datas.email],
      subject: datas.subject,
      html: `<h5>Chat Form no-reply.bilalellahi.com</h5>
                <h3>${datas.message}</h3>
                <p>${datas.email}</p>
                <p>${datas.name}</p>
                ${datas.html}`,
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    // res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error sending email: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Sends Otp to change password when forget email.
 * @param {string} name - Recipient's name.
 * @param {string} email - Recipient's email.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const resendEmailForgotPassword = async (datas, req, res) => {
  try {
    const { name, email, otp, subject = "Request for Password Reset" } = datas;

    const forgotPasswordHTML = otpTemplate(name, otp);
    // console.log("this ", datas);
    const { data, error } = await resend.emails.send({
      from: "no-reply@bilalellahi.com",
      to: [email],
      //   to: email,
      subject: subject,
      html: forgotPasswordHTML,
    });

    if (error) {
      console.error("Error in mail", error);
      //   return res.status(400).json({ message: error });
    }
    // console.log("DATA", data);

    // res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error in sending email controller: ", error);
    // res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Generates an OTP email template.
 * @param {string} name - Recipient's name.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const otpTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    "
  >
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background: #f4f7ff;
        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      "
    >
      <header>
        <table style="width: 100%;">
          <tbody>
            <tr style="height: 0;">
              <td>
               <strong>Beyond The Class</strong>
              </td>
              <td style="text-align: right;">
                <span
                  style="font-size: 16px; line-height: 30px; color: #ffffff;"
                  >${createDateTime()}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div
          style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          "
        >
          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1
              style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              "
            >
              Your OTP
            </h1>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              "
            >
              Hey ${name},
            </p>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-weight: 500;
                letter-spacing: 0.56px;
              "
            >
              Thank you for choosing Beyond The Class. Use the following OTP
              to complete the procedure to change your password. OTP is
              valid for
              <span style="font-weight: 600; color: #1f1f1f;">10 minutes</span>.
              Do not share this code with others, including Beyond The Class
              employees.
            </p>
            <p
              style="
                margin: 0;
                margin-top: 60px;
                font-size: 40px;
                font-weight: 600;
                letter-spacing: 25px;
                color: #ba3d4f;
              "
            >
              ${otp}
            </p>
          </div>
        </div>

        <p
          style="
            max-width: 400px;
            margin: 0 auto;
            margin-top: 90px;
            text-align: center;
            font-weight: 500;
            color: #8c8c8c;
          "
        >
          Need help? Ask at
          <a
            href="mailto:bilalillahi25@gmail.com"
            style="color: #499fb6; text-decoration: none;"
            >bilalillahi25@gmail.com</a
          >
          or visit our
          <a
            href=""
            target="_blank"
            style="color: #499fb6; text-decoration: none;"
            >Help Center</a
          >
        </p>
      </main>

      <footer
        style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        "
      >
        <p
          style="
            margin: 0;
            margin-top: 40px;
            font-size: 16px;
            font-weight: 600;
            color: #434343;
          "
        >
          Beyond The Class
        </p>
        <p style="margin: 0; margin-top: 8px; color: #434343;">
          DHA Lahore, Pakistan
        </p>
         <div style="margin: 0; margin-top: 16px;">
          <a href="" target="_blank" style="display: inline-block;">
            <img
              width="36px"
              alt="Facebook"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Instagram"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram"
          /></a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Twitter"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Youtube"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube"
          /></a>
        </div>
        <p style="margin: 0; margin-top: 16px; color: #434343;">
          Copyright © 2022 Company. All rights reserved.
        </p>
      </footer>
    </div>
  </body>
</html>

    `;
};















/**
 * Sends Otp to change password when forget email.
 * @param {string} name - Recipient's name.
 * @param {string} email - Recipient's email.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const resendEmailAccountConfirmation = async (datas, req, res) => {
  try {
    const { name, email, otp, subject = "Confirm Account" } = datas;

    const forgotPasswordHTML = confirmAccountTemplate(name, otp);
    // console.log("this ", datas);
    const { data, error } = await resend.emails.send({
      from: "BeyondTheClass@bilalellahi.com",
      to: [email],
      //   to: email,
      subject: subject,
      html: forgotPasswordHTML,
    });

    if (error) {
      console.error("Error in mail", error);
      //   return res.status(400).json({ message: error });
    }
    // console.log("DATA", data);

    // res.status(200).json({ message: "OTP delievered", data });
  } catch (error) {
    console.error("Error in sending email controller: ", error);
    // res.status(500).json({ message: "Internal Server Error" });
  }
};


/**
 * Generates an OTP email template.
 * @param {string} name - Recipient's name.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const confirmAccountTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    "
  >
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background: #f4f7ff;
        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      "
    >
      <header>
        <table style="width: 100%;">
          <tbody>
            <tr style="height: 0;">
              <td>
               <strong>Beyond The Class</strong>
              </td>
              <td style="text-align: right;">
                <span
                  style="font-size: 16px; line-height: 30px; color: #ffffff;"
                  >${createDateTime()}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div
          style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          "
        >
          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1
              style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              "
            >
              Your OTP
            </h1>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              "
            >
              Hey ${name},
            </p>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-weight: 500;
                letter-spacing: 0.56px;
              "
            >
              Thank you for choosing Beyond The Class. Use the following OTP
              to complete the procedure to Confirm Your Account. OTP is
              valid for
              <span style="font-weight: 600; color: #1f1f1f;">10 minutes</span>.
              Do not share this code with others, including Beyond The Class
              employees.
            </p>
            <p
              style="
                margin: 0;
                margin-top: 60px;
                font-size: 40px;
                font-weight: 600;
                letter-spacing: 25px;
                color: #ba3d4f;
              "
            >
              ${otp}
            </p>
          </div>
        </div>

        <p
          style="
            max-width: 400px;
            margin: 0 auto;
            margin-top: 90px;
            text-align: center;
            font-weight: 500;
            color: #8c8c8c;
          "
        >
          Need help? Ask at
          <a
            href="mailto:bilalillahi25@gmail.com"
            style="color: #499fb6; text-decoration: none;"
            >bilalillahi25@gmail.com</a
          >
          or visit our
          <a
            href=""
            target="_blank"
            style="color: #499fb6; text-decoration: none;"
            >Help Center</a
          >
        </p>
      </main>

      <footer
        style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        "
      >
        <p
          style="
            margin: 0;
            margin-top: 40px;
            font-size: 16px;
            font-weight: 600;
            color: #434343;
          "
        >
          Beyond The Class
        </p>
        <p style="margin: 0; margin-top: 8px; color: #434343;">
          DHA Lahore, Pakistan
        </p>
         <div style="margin: 0; margin-top: 16px;">
          <a href="" target="_blank" style="display: inline-block;">
            <img
              width="36px"
              alt="Facebook"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Instagram"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram"
          /></a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Twitter"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Youtube"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube"
          /></a>
        </div>
        <p style="margin: 0; margin-top: 16px; color: #434343;">
          Copyright © 2022 Company. All rights reserved.
        </p>
      </footer>
    </div>
  </body>
</html>

    `;
};













/**
 * Sends Otp to change password when forget email.
 * @param {string} name - Recipient's name.
 * @param {string} email - Recipient's email.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const resendEmailConfirmation = async (datas, req, res) => {
  try {
    const { name, email, otp, subject = "Confirm Email" } = datas;

    const verifyEmailHTML = verifyEmailTemplate(name, otp);
    // console.log("this ", datas);
    const { data, error } = await resend.emails.send({
      from: "BeyondTheClass@bilalellahi.com",
      to: [email],
      //   to: email,
      subject: subject,
      html: verifyEmailHTML,
    });

    if (error) {
      console.error("Error in mail", error);
      //   return res.status(400).json({ message: error });
    }
    // console.log("DATA", data);

    // res.status(200).json({ message: "OTP delievered", data });
  } catch (error) {
    console.error("Error in sending email controller: ", error);
    // res.status(500).json({ message: "Internal Server Error" });
  }
};


/**
 * Generates an OTP email template.
 * @param {string} name - Recipient's name.
 * @param {string} otp - The OTP to be sent.
 * @returns {string} - The HTML email content.
 */
const verifyEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    "
  >
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background: #f4f7ff;
        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      "
    >
      <header>
        <table style="width: 100%;">
          <tbody>
            <tr style="height: 0;">
              <td>
               <strong>Beyond The Class</strong>
              </td>
              <td style="text-align: right;">
                <span
                  style="font-size: 16px; line-height: 30px; color: #ffffff;"
                  >${createDateTime()}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div
          style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          "
        >
          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1
              style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              "
            >
              Your OTP
            </h1>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              "
            >
              Hey ${name},
            </p>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-weight: 500;
                letter-spacing: 0.56px;
              "
            >
              Thank you for choosing Beyond The Class. Use the following OTP
              to complete the procedure to Confirm Your Account. OTP is
              valid for
              <span style="font-weight: 600; color: #1f1f1f;">10 minutes</span>.
              Do not share this code with others, including Beyond The Class
              employees.
            </p>
            <p
              style="
                margin: 0;
                margin-top: 60px;
                font-size: 40px;
                font-weight: 600;
                letter-spacing: 25px;
                color: #ba3d4f;
              "
            >
              ${otp}
            </p>
          </div>
        </div>

        <p
          style="
            max-width: 400px;
            margin: 0 auto;
            margin-top: 90px;
            text-align: center;
            font-weight: 500;
            color: #8c8c8c;
          "
        >
          Need help? Ask at
          <a
            href="mailto:bilalillahi25@gmail.com"
            style="color: #499fb6; text-decoration: none;"
            >bilalillahi25@gmail.com</a
          >
          or visit our
          <a
            href=""
            target="_blank"
            style="color: #499fb6; text-decoration: none;"
            >Help Center</a
          >
        </p>
      </main>

      <footer
        style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        "
      >
        <p
          style="
            margin: 0;
            margin-top: 40px;
            font-size: 16px;
            font-weight: 600;
            color: #434343;
          "
        >
          Beyond The Class
        </p>
        <p style="margin: 0; margin-top: 8px; color: #434343;">
          DHA Lahore, Pakistan
        </p>
         <div style="margin: 0; margin-top: 16px;">
          <a href="" target="_blank" style="display: inline-block;">
            <img
              width="36px"
              alt="Facebook"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Instagram"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram"
          /></a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Twitter"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter"
            />
          </a>
          <a
            href=""
            target="_blank"
            style="display: inline-block; margin-left: 8px;"
          >
            <img
              width="36px"
              alt="Youtube"
              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube"
          /></a>
        </div>
        <p style="margin: 0; margin-top: 16px; color: #434343;">
          Copyright © 2022 Company. All rights reserved.
        </p>
      </footer>
    </div>
  </body>
</html>

    `;
};

















// /**
//  * Generates an email template for login attempt notification.
//  * @param {string} name - Recipient's name.
//  * @param {string} email - Recipient's email.
//  * @returns {string} - The HTML email content.
//  */
// const resendEmailAccountLOGIN = async (datas, req, res) => {
//   try {
//     const { name, email, subject = "Login Attempt" } = datas;


//     const userAgent = req.headers['user-agent'];

//     const parser = new UAParser();
//     const uaResult = parser.setUA(userAgent).getResult();
//     const deviceInfo = {
//       device: uaResult.device.type || "Desktop",
//       os: uaResult.os.name + " " + uaResult.os.version,
//       browser: uaResult.browser.name + " " + uaResult.browser.version,
//     };

//     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
// const location = await fetch(`http://ip-api.com/json/${ip}`).then(res => res.json());

//     const forgotPasswordHTML = loginAttemptTemplate(name, location, device, dateTime);
//     // console.log("this ", datas);
//     const { data, error } = await resend.emails.send({
//       from: "BeyondTheClass@bilalellahi.com",
//       to: [email],
//       //   to: email,
//       subject: subject,
//       html: forgotPasswordHTML,
//     });

//     if (error) {
//       console.error("Error in mail", error);
//       //   return res.status(400).json({ message: error });
//     }
//     // console.log("DATA", data);

//     // res.status(200).json({ message: "OTP delievered", data });
//   } catch (error) {
//     console.error("Error in sending email controller: ", error);
//     // res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// import UAParser from 'ua-parser-js';
// import fetch from 'node-fetch'; // or global fetch if using Node 18+

// const UAParser = require('ua-parser-js');
// const axios = require('axios');
// const resendAccountLogin= async (datas, req, res) => {
//   try {
//     const { name, email, otp, subject = "Confirm Account" } = datas;

//     // 1. Parse device info
//     const userAgent = req.headers['user-agent'];
//     const parser = new UAParser();
//     const uaResult = parser.setUA(userAgent).getResult();
//     const deviceInfo = `${uaResult.device.type || "Desktop"}, ${uaResult.os.name} ${uaResult.os.version}, ${uaResult.browser.name} ${uaResult.browser.version}`;

//     // 2. Get location info
//     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     const locationRes = await fetch(`http://ip-api.com/json/${ip}`);
//     const locationData = await locationRes.json();
//     const locationInfo = `${locationData.city}, ${locationData.regionName}, ${locationData.country} (ISP: ${locationData.isp})`;

//     // 3. Add to email
//     const forgotPasswordHTML = confirmAccountTemplate(name, otp, {
//       deviceInfo,
//       locationInfo,
//       ip
//     });

//     const { data, error } = await resend.emails.send({
//       from: "BeyondTheClass@bilalellahi.com",
//       to: [email],
//       subject,
//       html: forgotPasswordHTML,
//     });

//     if (error) {
//       console.error("Error in mail", error);
//     }
//   } catch (error) {
//     console.error("Error in sending email controller: ", error);
//   }
// };


const UAParser = require('ua-parser-js');
const axios = require('axios');

const resendAccountLogin = async (datas, req, res) => {
  try {
    const { name, email,  subject = "Login Attempt" } = datas;

    // 1. Parse device info from User-Agent
    const userAgent = req.headers['user-agent'] || 'Unknown';
    console.log("User-Agent:", userAgent, req.headers);
    const parser = new UAParser();
    const uaResult = parser.setUA(userAgent).getResult();
    console.log("Parsed User-Agent:", uaResult);
    const deviceInfo = `${uaResult.device.type || "Desktop"}, ${uaResult.os.name || "Unknown OS"} ${uaResult.os.version || ""}, ${uaResult.browser.name || "Unknown Browser"} ${uaResult.browser.version || ""}`;

    // 2. Get IP address
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      'Unknown IP';

    // 3. Get location info using IP
    let locationInfo = 'Location Unknown';
    try {
      const locationRes = await axios.get(`http://ip-api.com/json/${ip}`);
      const locationData = locationRes.data;

      if (locationData.status === 'success') {
        locationInfo = `${locationData.city}, ${locationData.regionName}, ${locationData.country} (ISP: ${locationData.isp})`;
      }
    } catch (err) {
      console.warn("Failed to fetch location info:", err.message);
    }

    // 4. Generate email HTML
    const forgotPasswordHTML = loginAttemptTemplate(name,  {
      deviceInfo,
      locationInfo,
      ip,
    });

    // 5. Send email
    const { data, error } = await resend.emails.send({
      from: "BeyondTheClass@bilalellahi.com",
      to: [email],
      subject,
      html: forgotPasswordHTML,
    });

    if (error) {
      console.error("Error in sending email:", error);
    }
  } catch (error) {
    console.error("Server error in resendAccountLogin:", error);
  }
};


/**
 * Generates an email template for login attempt notification.
 * @param {string} name - Recipient's name.
 * @param {string} location - Location of the login attempt.
 * @param {string} device - Device/browser used for login.
 * @param {string} dateTime - Date and time of the attempt.
 * @returns {string} - The HTML email content.
 */
const loginAttemptTemplate = (name, {
      deviceInfo,
      locationInfo,
      ip,
    }) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="ie=edge" />
      <title>Login Attempt Alert</title>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
    </head>
    <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #ffffff; font-size: 14px;">
      <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff;
        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
        background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; color: #434343;">
        <header>
          <table style="width: 100%;">
            <tbody>
              <tr>
                <td><strong>Beyond The Class</strong></td>
                <td style="text-align: right;">
                  <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toDateString()}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </header>

        <main>
          <div style="margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
            <div style="max-width: 489px; margin: 0 auto;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">New Login Attempt</h1>
              <p style="margin-top: 17px; font-size: 16px; font-weight: 500;">Hello ${name},</p>
              <p style="margin-top: 17px; font-weight: 500; letter-spacing: 0.56px;">
                We noticed a new login attempt to your <strong>Beyond The Class</strong> account:
              </p>
             <p><strong>Login Attempt Details:</strong></p>
<ul>
  <li><strong>Device:</strong> ${deviceInfo}</li>
  <li><strong>Location:</strong> ${locationInfo}</li>
  <li><strong>IP:</strong> ${ip}</li>
</ul>

              <p style="margin-top: 30px;">
                If this was you, no further action is needed. <br />
                If not, we recommend changing your password immediately and reviewing your account activity.
              </p>
              <a href="https://yourwebsite.com/reset-password" style="
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #ba3d4f;
                color: #fff;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
              ">Change Password</a>
            </div>
          </div>

          <p style="max-width: 400px; margin: 90px auto 0; text-align: center; font-weight: 500; color: #8c8c8c;">
            Need help? Email us at
            <a href="mailto:bilalillahi25@gmail.com" style="color: #499fb6;">bilalillahi25@gmail.com</a>
            or visit our
            <a href="" target="_blank" style="color: #499fb6;">Help Center</a>
          </p>
        </main>

        <footer style="max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
          <p style="margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">Beyond The Class</p>
          <p style="margin-top: 8px; color: #434343;">DHA Lahore, Pakistan</p>
          <div style="margin-top: 16px;">
            <a href="#" target="_blank"><img width="36" alt="Facebook" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook" /></a>
            <a href="#" target="_blank" style="margin-left: 8px;"><img width="36" alt="Instagram" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram" /></a>
            <a href="#" target="_blank" style="margin-left: 8px;"><img width="36" alt="Twitter" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter" /></a>
            <a href="#" target="_blank" style="margin-left: 8px;"><img width="36" alt="YouTube" src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube" /></a>
          </div>
          <p style="margin-top: 16px; color: #434343;">Copyright © ${new Date().getFullYear()} Company. All rights reserved.</p>
        </footer>
      </div>
    </body>
  </html>
  `;
};

module.exports = { resendEmail, resendEmailForgotPassword, resendEmailAccountConfirmation, resendEmailConfirmation , resendAccountLogin};
