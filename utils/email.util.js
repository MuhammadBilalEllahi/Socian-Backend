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
    console.log("this ", datas);
    const { data, error } = await resend.emails.send({
      from: "no-reply@bilalellahi.com",
      to: ["bilalillahi25@gmail.com", email],
      //   to: email,
      subject: subject,
      html: forgotPasswordHTML,
    });

    if (error) {
      console.log("Errorin mail", error);
      //   return res.status(400).json({ message: error });
    }
    console.log("DATA", data);

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
    console.log("this ", datas);
    const { data, error } = await resend.emails.send({
      from: "BeyondTheClass@bilalellahi.com",
      to: [email],
      //   to: email,
      subject: subject,
      html: forgotPasswordHTML,
    });

    if (error) {
      console.log("Error in mail", error);
      //   return res.status(400).json({ message: error });
    }
    console.log("DATA", data);

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

module.exports = { resendEmail, resendEmailForgotPassword, resendEmailAccountConfirmation };
