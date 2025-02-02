// const generateToken = require("../utils/generate.token.js");
const jwt = require("jsonwebtoken");

const express = require("express");
const router = express.Router();
const moment = require("moment");

const {
  resendEmail,
  resendEmailForgotPassword,
  resendEmailAccountConfirmation,
} = require("../../utils/email.util.js");
const bcryptjs = require("bcryptjs");
const {
  generateOtp6Digit,
  createUniqueUsername,
  sendOtp,
  getUserDetails,
} = require("../../utils/utils.js");

const User = require("../../models/user/user.model.js");
const Campus = require("../../models/university/campus.university.model.js");
const University = require("../../models/university/university.register.model.js");
const generateToken = require("../../utils/generate.token.js");
const { OTP } = require("../../models/otp/otp.js");
const Department = require("../../models/university/department/department.university.model.js");
const UserRoles = require("../../models/userRoles.js");
const { platformSessionOrJwt_CALL_on_glogin_only } = require("../../utils/platform/jwt.session.platform.js");
// const protectRoute = require("../../middlewares/protect.route.js");

router.get("/session", async (req, res) => {
  // console.log("Req user:", req.session.user)
  // console.log("The session data is in session ", req.session)
  if (req.session.user) {
    const session = {
      _id: req.session.user._id,
      name: req.session.user.name,
      email: req.session.user.email,
      username: req.session.user.username,
      profile: req.session.user.profile,
      university: req.session.user.university,
      super_role: req.session.user.super_role,
      role: req.session.user.role,

      verified: req.session.user.universityEmailVerified,
      joined: req.session.user.joined,
      requiresMoreInformation: req.session?.requiresMoreInformation ?? false
      // joinedSocieties: req.session.user.joinedSocieties,
      // joinedSubSocieties: req.session.user.joinedSubSocieties,
    }
    // console.log("USER CONNECTIVITY", req.session.user.role, UserRoles.teacher)

    if (req.session.user.role === UserRoles.teacher) {
      // console.log("USER CONNECTIVITY2", req.session.user.role, UserRoles.teacher)

      session.teacherConnectivities = {
        attached: req.session.user?.teacherConnectivities?.attached ?? false,
        teacherModal: req.session.user?.teacherConnectivities?.teacherModal ?? null
      }
    }
    res.status(200).json(session);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

router.post("/login", async (req, res) => {
  const { universityId, campusId, email, password } = req.body;

  let user;
  let userRoleBool = false;
  try {
    // console.log("login log", universityId, campusId, email, password);
    const platform = req.headers["x-platform"];

    let query = {
      $or: [
        { universityEmail: email },
        { personalEmail: email },
        { secondaryPersonalEmail: email },
      ],
    };
    // console.log(query);

    if (universityId && campusId) {
      query.$and = [
        query, // Include to the existing $or condition
        {
          "university.universityId": universityId,
          "university.campusId": campusId,
        },
      ];
    }

    // console.log("later", query);

    if (!email.includes("@")) {
      query = {
        username: email
      }
    }
    user = await User.findOne(query);

    const isPassMatched = await bcryptjs.compare(
      password,
      user?.password || ""
    );

    if (!user || !isPassMatched)
      return res.status(400).json({ error: "Invalid email or password" });

    // console.log(
    //   user.restrictions.blocking.isBlocked,
    //   user.restrictions.approval.isApproved
    // );
    if (user.restrictions.blocking.isBlocked) {
      return res.status(400).json({ error: "User blocked or Up for Review" });
    }
    if (user.role === "alumni" || user.role === "ext_org") {
      if (!user.restrictions.approval.isApproved) {
        return res.status(400).json({ error: "User not approved yet" });
      }
    }

    if (user.role === UserRoles.student || user.role === UserRoles.teacher) {
      if (user.universityEmailVerified === false) {
        deliverOTP(user, resendEmailAccountConfirmation, req, res)

        return res.status(200).json({
          success: true,
          redirectUrl: `${process.env.FRONTEND_URL}/otp/${user._id}?email=${user.role === UserRoles.alumni ? user.personalEmail : user.universityEmail}`,
        });
      }
    }

    if (user.role === "student" || user.role === "teacher" || user.role === "alumni") {
      userRoleBool = true;
      await user.populate([
        { path: "university.universityId", select: "-users _id" },
        { path: "university.campusId", select: "-users _id" },
        { path: "university.departmentId", select: "name _id" },

        // { path: "subscribedSocities", select: "name _id" },
        // { path: "subscribedSubSocities", select: "name _id" },
        // { path: "profile.posts" },
        // {
        //   path: "profile.posts",
        //   populate: [
        //     { path: "author", select: "name _id" },
        //     { path: "society", select: "name _id" },
        //     { path: "voteId", select: "downVotesCount upVotesCount userVotes", },

        //     {
        //       path: "references",
        //       select: "role campusOrigin universityOrigin",
        //       populate: [
        //         { path: "campusOrigin", select: "name _id" },
        //         { path: "universityOrigin", select: "name _id" },
        //       ],
        //     },
        //   ],
        // },
      ]);
    }


    // console.log("user populated", user.university, "role", userRoleBool);

    if (platform === "app") {
      // console.log("in app type", typeof process.env.JWT_EXPIRY_TIME);

      const { accessToken, refreshToken } = generateToken(user, userRoleBool);

      user.tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
      await user.save();
      // console.log("in app", token);

      // Send JWT to the client
      res.status(200).json({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else if (platform === "web") {
      req.session.user = {
        _id: user._id,
        name: user.name,
        email:
          user.universityEmail ||
          user.personalEmail ||
          user.secondaryPersonalEmail,
        username: user.username,
        profile: user.profile,
        university: userRoleBool ? user.university : undefined,
        super_role: user.super_role,
        role: user.role,
        verified: user.universityEmailVerified,
        joined: moment(user.createdAt).format('MMMM DD, YYYY'),
        requiresMoreInformation: user.requiresMoreInformation ?? false,
        // joinedSocieties: user.subscribedSocities,
        // joinedSubSocieties: user.subscribedSubSocities,
      };
      if (user.role === UserRoles.teacher) {
        req.session.user.teacherConnectivities = {
          attached: user?.teacherConnectivities?.attached ?? false,
          teacherModal: user?.teacherConnectivities?.teacherModal ?? null
        }
      }

      // console.log("User in WEB", req.session.user);

      req.session.references = {
        university: {
          name: user.university.universityId.name,
          _id: user.university.universityId._id,
        },
        campus: {
          name: user.university.campusId.name,
          _id: user.university.campusId._id,
        },
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        // console.log("Session user in Longin Controller : ", req.session.user)
      });

      // console.log(req.session.references);
      // res.setHeader("Authorization", `Bearer ${token}`);

      return res.status(200).json(req.session.user);
    } else {
      return res.status(400).json({ error: "Invalid platform" });
    }
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * USE BELOW CODE ONLY IF OTP is correct
 * Handles user response based on platform type.
 * 
 * @param {string} platform - Platform type ("app" or "web").
 * @param {object} user - User object from the database.
 * @param {object} res - Express.js response object.
 * @param {object} req - Express.js request object (for session in web).
 * @param {function} generateToken - Function to generate access and refresh tokens.
 * @returns {Promise} - Resolves with the response sent to the client.
 */
const handlePlatformResponse = async (user, res, req) => {
  // console.log("here")
  const platform = req.headers["x-platform"];
  // console.log("here2", platform)
  if (platform === "app") {

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateToken(user);

    // Assign tokens to the user object
    user.tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    await user.save(); // Save the updated user tokens

    // Send JWT tokens to the client
    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } else if (platform === "web") {
    // Set user session data
    // console.log("here", "pla")
    req.session.user = {
      _id: user._id,
      name: user.name,
      email:
        user.universityEmail ||
        user.personalEmail ||
        user.secondaryPersonalEmail,
      username: user.username,
      profile: user.profile,
      university: user.role !== 'ext_org' ? user.university : undefined,
      super_role: user.super_role,
      role: user.role,
      verified: user.universityEmailVerified,
      joined: user.joined,
      requiresMoreInformation: user.requiresMoreInformation ?? false,
      // joinedSocieties: user.joinedSocieties,
      // joinedSubSocieties: user.joinedSubSocieties,

    };
    if (user.role === UserRoles.teacher) {
      req.session.user.teacherConnectivities = {
        attached: user?.teacherConnectivities?.attached ?? false,
        teacherModal: user?.teacherConnectivities?.teacherModal ?? null
      }
    }

    // Set references for the session
    req.session.references = {
      university: {
        name: user.university.universityId.name,
        _id: user.university.universityId._id,
      },
      campus: {
        name: user.university.campusId.name,
        _id: user.university.campusId._id,
      },
    };

    // Save session and handle any errors
    return req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Send the session user as the response
      return res.status(200).json(req.session.user);
    });
  } else {
    // Handle invalid platform
    return res.status(400).json({ error: "Invalid platform" });
  }
};

router.post("/register", async (req, res) => {
  const { name, username, universityEmail, personalEmail, password, universityId, campusId, role, departmentId } = req.body;
  let user;
  let query;

  // console.log(universityEmail, personalEmail, password, universityId, campusId, role);
  try {
    if (!name) return res.status(302).json({ error: "name is required" });
    if (!universityEmail) return res.status(302).json({ error: "University Email is required" });

    if (!username) return res.status(302).json({ error: "username is required" });
    if (!role) return res.status(302).json({ error: "role is required" });
    if (role === 'alumni' && !personalEmail) return res.status(302).json({ error: "alumni requires personal email is required" });
    if (!universityId && !campusId) { return res.status(302).json("Select a Univerisity"); }
    if (!departmentId) return res.status(302).json({ error: "No Department Selected" })

    console.log("deprtment ", departmentId)
    const departmentExists = await Department.findOne({
      _id: departmentId,
      'references.universityOrigin': universityId,
      'references.campusOrigin': campusId
    })
    if (!departmentExists) return res.status(404).json({ error: "No Department Found" })

    if (role === 'teacher' || role === 'student') {
      query = { universityEmail };
    } else if (role === 'alumni') {
      query = {
        $or: [{ universityEmail }, { personalEmail }, { secondaryPersonalEmail: personalEmail }],
      };
    }

    // console.log(query);


    query.$and = [
      // query, // Include to the existing $or condition
      {
        "university.universityId": universityId,
        "university.campusId": campusId,
      },
    ];


    // console.log("later", query);
    user = await User.findOne(query);

    if (user) {
      if (user.universityEmailVerified === false) {
        deliverOTP(user, resendEmailAccountConfirmation, req, res)

        return res.status(200).json({
          success: true,
          redirectUrl: `${process.env.FRONTEND_URL}/otp/${user._id}?email=${role === 'alumni' ? user.personalEmail : user.universityEmail}`,
        });


        // res.set({
        //   "Access-Control-Allow-Origin": process.env.FRONTEND_URL,
        //   "Access-Control-Allow-Credentials": "true", // Required for cookies/auth
        // });
        // return res
        //   .redirect(`${process.env.FRONTEND_URL}/otp/${user._id}`)

      } else {
        return res.status(302).json({ error: "Already Registered" }); // already registered
      }
    }
    // console.log("No", user);

    // console.log("here");

    let newUser;

    if (!(role === "ext_org")) {
      const uniExists = await University.findOne({ _id: universityId });

      if (!uniExists)
        return res.status(404).json({ error: "Hmm.. Seems Odd, this should not happen" }); // no uni

      const campus = await Campus.findOne({
        _id: campusId,
        universityOrigin: universityId,
      });

      // console.log(campus);
      if (!campus)
        return res.status(404).json({ error: "Hmm.. Seems Odd, this should not happen" }); // no campus

      if (role !== 'teacher') {

        if (!campus.emailPatterns.regex) {
          return res.status(425).json("Tell your campus mod to update/register")
        }
        const regex = new RegExp(campus.emailPatterns.regex);
        const isEmailValid = regex.test(universityEmail);
        // const isEmailValid = emailPatterns.some(pattern => new RegExp(pattern).test(universityEmail));
        console.log("Valid", isEmailValid);

        if (!isEmailValid) {
          // TODO Send report to moderator and superadmin
          return res
            .status(400)
            .json({ error: "University email does not match the required format!" });
        }

      } else {


        if (!campus.emailPatterns.regex) {
          return res.status(425).json("Tell your campus mod to update/register")
        }
        const regex = new RegExp(campus.emailPatterns.regex);



        if (regex.test(universityEmail)) {
          return res.status(400).json({
            error: "Student email detected. You cannot register as a teacher with a student email!",
          });
        }

        // Validate domain for teachers
        const domainRegex = new RegExp(campus.emailPatterns.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
        if (!domainRegex.test(universityEmail)) {
          return res.status(400).json({ error: "Invalid email domain for teacher registration" });
        }
      }


      const hashedPassword = await bcryptjs.hash(password, 10);

      newUser = new User({
        name, username, password: hashedPassword,
        university: { universityId, campusId, departmentId },
        universityEmail,
        role,
        super_role: "none",
      });
      role === "alumni"
        && (newUser.personalEmail = personalEmail)

      await newUser.save();

      campus.users.push(newUser._id);
      uniExists.users.push(newUser._id);

      departmentExists.users.push(newUser._id)
      departmentExists.save()

      await campus.save();
      await uniExists.save();
    } else if (role === 'ext_org') {
      const hashedPassword = await bcryptjs.hash(password, 10);
      // console.log("here2");
      // this is reachable to only
      newUser = new User({
        name,
        username,
        password: hashedPassword,
        personalEmail: personalEmail,
        role: role,
        super_role: "none",
      });
      await newUser.save();

      // console.log("here3");
    } else return res.status(400).json({ error: "Role not found in dictionary" })

    deliverOTP(newUser, resendEmailAccountConfirmation, req, res)



    return res.status(200).json({
      success: true,
      redirectUrl: `${process.env.FRONTEND_URL}/otp/${newUser._id}?email=${role === 'alumni' ? personalEmail : universityEmail}`,
    });
    // return res.status(201).json({ message: "OTP has been delivered to your account" });
  } catch (error) {
    console.error("Error in /register", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post('/complete/info', async (req, res) => {
  try {
    const { departmentId, name, username, personalEmail, role, password } = req.body;
    // console.log("0...", departmentId, name, username, personalEmail, role, password)

    if (!departmentId) return res.status(404).json({ error: "Select a Department" })
    if (!name) return res.status(404).json({ error: "Select a Name" })
    if (!username) return res.status(404).json({ error: "Select a Username" })
    if (!role) return res.status(404).json({ error: "Select a Role" })
    if (!password) return res.status(404).json({ error: "Select a Password" })
    if (!personalEmail && role === UserRoles.alumni) return res.status(404).json({ error: "Alumni requires Personal Email" })
    // console.log("1...", departmentId, name, username, personalEmail, role, password)

    const { userId } = getUserDetails(req)
    const departmentExists = await Department.findById(departmentId);
    if (!departmentExists) return res.status(404).json({ error: "No Such Department Id Exists" })

    const hashedPassword = await bcryptjs.hash(password, 10);

    // console.log("2...", departmentId, name, username, personalEmail, role, password)


    const userExists = await User.findByIdAndUpdate(
      userId, {
      'university.departmentId': departmentId,
      username: username,
      name: name,

      role,
      password: hashedPassword,
      super_role: 'none',
      requiresMoreInformation: false
    });
    if (!userExists) return res.status(404).json({ error: "This User doesnot exists" })

    if (role === UserRoles.alumni) {
      userExists.personalEmail = personalEmail
    }
    userExists.save()
    departmentExists.users.push(userExists._id)
    departmentExists.save()

    await userExists.populate([
      { path: "university.universityId", select: "-users _id" },
      { path: "university.campusId", select: "-users _id" },
      { path: "university.departmentId", select: "name _id" },
    ]);

    platformSessionOrJwt_CALL_on_glogin_only(userExists, req, res)

    res.status(200).json({ message: "Completed" });
  } catch (error) {
    console.error("Error in complete/info:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
})


/**
 * Verifies the OTP sent to the user.
 * @route POST /verify-otp
 * @param {string} email - The email address of the user (optional if phone is provided).
 * @param {string} phone - The phone number of the user (optional if email is provided).
 * @param {string} otp - The OTP to be verified.
 * @returns {Object} - A success or failure message.
 */
router.post("/registration-verify-otp", async (req, res) => {
  const { otp, userId } = req.body;
  // // Validate inputs
  // if ((!email && !phoneNumber) || !otp) {
  //   return res
  //     .status(400)
  //     .json({ message: "Email or phoneNumber and OTP are required." });
  // }

  try {
    const user = await User.findById({ _id: userId })
    if (!user) return res.status(406).json('Session out or token expired')
    const query = { ref: user._id }

    // console.log("OTP", otp)
    // Find the OTP entry
    const otpEntry = await OTP.findOne(query);


    if (!otpEntry) {
      return res
        .status(404)
        .json({ message: "No OTP found for the provided details." });
    }

    if (otpEntry.used === true) {
      await OTP.findByIdAndDelete(otpEntry._id)
      return res.status(404)
        .json({ message: "OTP used already." });
    }



    const isOTPMatched = await bcryptjs.compare(
      otp,
      otpEntry.otp || ""
    );


    if (!isOTPMatched) {
      return res.status(401).json({ message: "Invalid OTP." });
    }


    if (moment().isAfter(moment(otpEntry.otpExpiration))) {
      return res.status(401).json({ message: "OTP has expired." });
    }

    // OTP is valid

    otpEntry.used = true;
    await otpEntry.save();

    if (otpEntry.email === user.universityEmail) {
      user.universityEmailVerified = true
      user.restrictions.blocking.isBlocked = false
    }
    if (otpEntry.email === user.personalEmail) {
      user.personalEmailVerified = true
    }
    if (otpEntry.email === user.secondaryPersonalEmail) {
      user.secondaryPersonalEmailVerified = true
    }
    // if (user.role === 'student' || user.role === 'teacher') 
    // if (user.role === 'alumni') user.personalEmailVerified = true

    await user.save()

    // res.status(200).json({ message: "OTP verified successfully." })

    await user.populate([
      { path: "university.universityId", select: "-users _id" },
      { path: "university.campusId", select: "-users _id" },
      { path: "subscribedSocities", select: "name _id" },
      { path: "subscribedSubSocities", select: "name _id" },

    ]);

    await handlePlatformResponse(user, res, req);


  } catch (error) {
    console.error("Error in verify-otp:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



router.put("/update/name", async (req, res) => {
  const { name, userId } = req.body;
  let user;

  try {
    const platform = req.headers["x-platform"];
    if (platform === "web") {
      user = await User.findById({ _id: req.session.user._id });
    } else if (platform === "app") {
      user = await User.findById({ _id: userId });
    } else {
      return res.status(500).json("Platform not specificied");
    }

    user.name = name;
    user.save();
    return res.status(200).json({ message: "Name Change Successfully" });
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/update/username", async (req, res) => {
  const { username, userId } = req.body;
  let user;

  try {
    const platform = req.headers["x-platform"];
    if (platform === "web") {
      user = await User.findById({ _id: req.session.user._id });
    } else if (platform === "app") {
      user = await User.findById({ _id: userId });
    } else {
      return res.status(500).json("Platform not specificied");
    }

    const usernameExists = await User.findOne({ username: username });
    if (usernameExists)
      return res.status(302).json({ message: "Username already exists" });
    user.username = username;
    user.save();
    return res.status(200).json({ message: "Username Change Successfully" });
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/update/email", async (req, res) => {
  const { email, userId, emailType } = req.body;
  let user;

  try {
    const platform = req.headers["x-platform"];
    if (platform === "web") {
      user = await User.findById({ _id: req.session.user._id });
      await user.updateEmail(emailType, email);
    } else if (platform === "app") {
      user = await User.findById({ _id: userId });
      await user.updateEmail(emailType, email);
    } else {
      return res.status(500).json("Platform not specificied");
    }

    // send otp
    // OTP SCHEMA

    //   user[emailType] = email;
    // await user.save();

    return res.status(200).json({ message: "Username Change Successfully" });
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// router.post("/register-bulk", async (req, res) => {
//   const users = req.body.users; // Expecting an array of user data

//   const now = moment();
//   const formattedTime = now.format("HH:mm:ss:SSS");
//   // console.log("START ", formattedTime);

//   if (!Array.isArray(users)) {
//     return res.status(400).json({ message: "Invalid data format" });
//   }

//   const createdUsers = [];
//   const errors = [];

//   for (let i = 0; i < users.length; i++) {
//     const { email, password, universityId, campusId, role } = users[i];
//     let user;
//     let query;

//     try {
//       const platform = req.headers["x-platform"];

//       if (email.includes(".edu")) {
//         query = { universityEmail: email };
//       } else {
//         query = {
//           $or: [{ personalEmail: email }, { secondaryPersonalEmail: email }],
//         };
//       }

//       if (universityId && campusId) {
//         query.$and = [
//           {
//             "university.universityId": universityId,
//             "university.campusId": campusId,
//           },
//         ];
//       }

//       user = await User.findOne(query);

//       if (user) {
//         // console.log("error " + i);
//         errors.push({ email, message: "User already registered" });
//         continue; // Skip this user if already registered
//       }

//       if (
//         (role === "student" || role === "teacher") &&
//         (user?.personalEmail || user?.secondaryPersonalEmail)
//       ) {
//         // console.log("error " + i);
//         errors.push({
//           email,
//           message: "User already registered with a personal email",
//         });
//         continue; // Skip this user if already registered
//       }

//       if (!(role === "ext_org")) {
//         const uniExists = await University.findOne({ _id: universityId });

//         if (!uniExists) {
//           // console.log("error " + i);
//           errors.push({ email, message: "University does not exist" });
//           continue; // Skip if university doesn't exist
//         }

//         const campus = await Campus.findOne({
//           _id: campusId,
//           universityOrigin: universityId,
//         });

//         if (!campus) {
//           // console.log("error " + i);
//           errors.push({ email, message: "Campus does not exist" });
//           continue; // Skip if campus doesn't exist
//         }

//         const emailPatterns = campus.emailPatterns.studentPatterns.map(
//           (pattern) => pattern.replace(/\d+/g, "\\d+")
//         );

//         const combinedPattern = `^(${emailPatterns.join("|")})$`;
//         const regex = new RegExp(combinedPattern);
//         const isEmailValid = regex.test(email);

//         if (!isEmailValid) {
//           // console.log("error " + i);
//           errors.push({
//             email,
//             message: "University email does not match the required format",
//           });
//           continue; // Skip if email format is invalid
//         }

//         const hashedPassword = await bcryptjs.hash(password, 10);

//         const newUser = new User({
//           username: email.split("@")[0] + email.split(".")[0],
//           password: hashedPassword,
//           university: {
//             universityId: universityId,
//             campusId: campusId,
//           },
//           role: role,
//           super_role: "none",
//         });

//         role === "alumni"
//           ? (newUser.personalEmail = email)
//           : (newUser.universityEmail = email);

//         await newUser.save();

//         campus.users.push(newUser._id);
//         uniExists.users.push(newUser._id);

//         await campus.save();
//         await uniExists.save();

//         createdUsers.push(newUser);
//       } else {
//         const hashedPassword = await bcryptjs.hash(password, 10);

//         const newUser = new User({
//           username: email.split("@")[0],
//           password: hashedPassword,
//           personalEmail: email,
//           role: role,
//           super_role: "none",
//         });

//         await newUser.save();

//         createdUsers.push(newUser);
//       }
//     } catch (error) {
//       // console.log("error " + i);
//       errors.push({ email, message: "Error processing user" });
//       console.error("Error in processing user", email, error.message);
//     }
//   }

//   if (errors.length > 0) {
//     return res.status(400).json({ errors, createdUsers });
//   }

//   const now2 = moment();
//   const formattedTime2 = now2.format("HH:mm:ss:SSS");
//   // console.log("END ", formattedTime2);

//   return res.status(201).json({
//     message: "Bulk registration successful!",
//     createdUsers,
//     errors,
//   });
// });

router.put("/reset-password", async (req, res) => {
  const { oldPassword, newPassword, userId } = req.body;

  let user;
  try {
    if (oldPassword === newPassword)
      return res
        .status(302)
        .json({ mesage: "Old and New Passowrd Input can not be same" });

    const platform = req.headers["x-platform"];

    // console.log(userId);
    if (platform === "app") {
      if (!userId)
        return res.status(409).json({ error: "Error parsing token" });
      user = await User.findById({ _id: userId });
    } else if (platform === "web") {
      user = await User.findById({ _id: req.session.user._id });
    }

    const isPassMatched = await bcryptjs.compare(
      oldPassword,
      user?.password || ""
    );

    if (!user) return res.status(400).json({ error: "No user exists" });
    if (!isPassMatched)
      return res.status(400).json({ error: "Old password wrong" });
    if (isPassMatched && oldPassword === newPassword)
      return res
        .status(302)
        .json({ mesage: "Old and New Passowrd can not be same" });

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password Changed Successfully" });
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/forgot-password", async (req, res) => {
  const { email } = req.body;
  let user;
  try {
    // if (isValidEduEmail(email)) {
    //   query = { universityEmail: email };
    // } else {
    query = {
      $or: [
        { universityEmail: email },
        { personalEmail: email },
        { secondaryPersonalEmail: email }
      ],
    };
    // }
    // console.log(query);

    user = await User.findOne(query);

    if (!user)
      return res.status(304).json({
        message: "No Account Exists",
      });

    const { otp, otpResponse } = await sendOtp(
      null,
      email,
      user._id,
      user.name
    );
    if (!otpResponse) {
      return res.status(500).json({ message: "Failed to generate OTP" });
    }
    // console.log("otp", otp, otpResponse);
    const datas = {
      name: user.name,
      email,
      otp,
    };
    resendEmailForgotPassword(datas, req, res);

    return res.status(200).json({
      message: "Check your mail for OTP (if user exists)",
    });
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/logout", async (req, res) => {
  const platform = req.headers["x-platform"];
  const { userId } = req.body;

  try {
    if (platform === "web") {
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        // Clear the cookie on the client side
        res.clearCookie("iidxi");
        return res.status(200).json({ message: "Logged out successfully" });
      });
      return;
    } else if (platform === "app") {
      let user = await User.findById({ _id: userId });

      //TODO also remove from client side
      user.tokens = {
        access_token: "",
        refresh_token: "",
      };
      await user.save();
      return res.status(200).json({ message: "Logged out successfully" });
    } else {
      return res.status(500).json("Invalid Params");
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// Refresh Token Route
router.put("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  try {
    const platform = req.headers["x-platform"];

    if (platform === "app") {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      // Find user by the decoded ID
      const user = await User.findById(decoded._id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      // Generate new access token
      const { accessToken } = generateToken(user);

      // Send the new access token
      res.status(200).json({
        accessToken,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// function isValidEduEmail(email) {
//   // Check for exactly one "@" and ".edu." after "@"
//   const atIndex = email.indexOf("@");
//   const lastAtIndex = email.lastIndexOf("@");

//   // Ensure only one '@' exists and it's followed by ".edu."
//   if (atIndex === -1 || atIndex !== lastAtIndex) {
//     return false; // More than one "@" or no "@" at all
//   }

//   // Check if ".edu." comes after the "@"
//   const domain = email.substring(atIndex + 1); // Extract the domain part after "@"
//   return domain.includes(".edu.") && domain.indexOf(".edu.") > 0;
// }

/**
 * Verifies the OTP sent to the user.
 * @route POST /verify-otp
 * @param {string} email - The email address of the user (optional if phone is provided).
 * @param {string} phone - The phone number of the user (optional if email is provided).
 * @param {string} otp - The OTP to be verified.
 * @returns {Object} - A success or failure message.
 */
router.post("/verify-otp", async (req, res) => {
  const { email, phoneNumber, otp } = req.body;

  // Validate inputs
  if ((!email && !phoneNumber) || !otp) {
    return res
      .status(400)
      .json({ message: "Email or phoneNumber and OTP are required." });
  }

  try {
    const query = email ? { email } : { phoneNumber };

    // Find the OTP entry
    const otpEntry = await OTP.findOne(query, { used: false });


    if (!otpEntry) {
      return res
        .status(404)
        .json({ message: "No OTP found for the provided details." });
    }

    if (otpEntry.used === true) {
      await OTP.findByIdAndDelete({ _id: otpEntry._id })
      return res.status(404)
        .json({ message: "OTP used already." });
    }



    const isOTPMatched = await bcryptjs.compare(
      otp,
      otpEntry.otp || ""
    );


    if (!isOTPMatched) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    if (moment().isAfter(moment(otpEntry.otpExpiration))) {
      return res.status(401).json({ message: "OTP has expired." });
    }

    // OTP is valid

    otpEntry.used = true;
    // delete after this: abhi ni. abhi tou hash k andr expiry time bhi dalna h
    await otpEntry.save();
    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error in verify-otp:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



router.post("/verify/otp/password", async (req, res) => {
  const { email, phoneNumber, otp } = req.body;

  // Validate inputs
  if ((!email && !phoneNumber) || !otp) {
    return res
      .status(400)
      .json({ message: "Email or phoneNumber and OTP are required." });
  }

  // console.log()
  try {
    const query = email ? { email, used: false } : { phoneNumber, used: false };

    // Find the OTP entry
    const otpEntry = await OTP.findOne(query);


    if (!otpEntry) {
      return res
        .status(404)
        .json({ message: "No OTP found for the provided details." });
    }

    if (otpEntry.used === true) {
      await OTP.findByIdAndDelete({ _id: otpEntry._id })
      return res.status(404)
        .json({ message: "OTP used already." });
    }



    const isOTPMatched = await bcryptjs.compare(
      otp,
      otpEntry.otp || ""
    );


    if (!isOTPMatched) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    if (moment().isAfter(moment(otpEntry.otpExpiration))) {
      return res.status(401).json({ message: "OTP has expired." });
    }
    console.log("Id", otpEntry.ref)

    // OTP is valid
    const token = jwt.sign(
      { email, token_id: otpEntry.ref },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // Token valid for 10 minutes
    );


    otpEntry.used = true;
    // delete after this: abhi ni. abhi tou hash k andr expiry time bhi dalna h
    await otpEntry.save();
    res.status(200).json({ message: "OTP verified successfully.", token: token });
  } catch (error) {
    console.error("Error in verify-otp:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post('/newPassword', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // console.log(token, newPassword)
    if (!token) return res.status(404).json({ message: "No Token Found" })
    if (newPassword === '') return res.status(404).json({ message: "No Password Found" })

    const data = jwt.verify(token, process.env.JWT_SECRET)
    if (!data) return res.status(404).json({ message: "Token Time Expired" })

    // console.log(data)
    const hashedpassword = await bcryptjs.hash(newPassword, 10)
    const user = await User.findByIdAndUpdate(data.token_id, { password: hashedpassword });


    if (!user) return res.status(404).json({ message: "No User For this Id" })
    res.status(200).json({ message: "Password Updated, Back to Login" })


  } catch (error) {
    console.error("Error in newPassword:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

const OTP_RESEND_LIMIT = Number(process.env.OTP_RESEND_LIMIT); // Max number of resends allowed
const OTP_COOLDOWN_PERIOD = Number(process.env.OTP_COOLDOWN_PERIOD); // 1 minutes in milliseconds
router.post("/resend-otp", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ message: "Email or phoneNumber is required." });
  }

  try {
    const query = email ? { email } : { phoneNumber };
    //     , used: false 
    // , used: false 

    // Find the existing OTP entry
    const otpEntry = await OTP.findOne(query);

    if (!otpEntry) {
      return res
        .status(404)
        .json({ message: "No OTP found for the provided details." });
    }



    // Check if the resend limit has been exceeded
    if (otpEntry.resendCount >= OTP_RESEND_LIMIT) {
      return res.status(403).json({
        message:
          "You have reached the maximum resend limit. Please request a new OTP.",
      });
    }

    // Check if cooldown period has passed
    const timeSinceLastResent = moment().diff(
      moment(otpEntry.lastResentAt),
      "seconds"
    );
    if (timeSinceLastResent < OTP_COOLDOWN_PERIOD / 1000) {
      const secondsLeft = Math.ceil(
        OTP_COOLDOWN_PERIOD / 1000 - timeSinceLastResent
      );
      return res.status(429).json({
        message: `Please wait ${secondsLeft} seconds before resending OTP.`,
      });
    }

    // Generate a new OTP
    const newOtp = generateOtp6Digit();
    const hashedOTP = await bcryptjs.hash(newOtp, 10);


    // Update the OTP entry
    otpEntry.otp = hashedOTP;
    otpEntry.otpExpiration = moment().add(2, "minutes"); // 2 minutes validity
    otpEntry.resendCount += 1;
    otpEntry.lastResentAt = moment();
    await otpEntry.save();

    const datas = {
      name: otpEntry.refName,
      email: otpEntry.email,
      otp: newOtp,
    };

    // Send the OTP to the user
    if (email) {
      resendEmailForgotPassword(datas, req, res);
    } else if (phoneNumber) {
      // does not exists
      // await sendOtpSMS(phoneNumber, newOtp);
    }

    res.status(200).json({ message: "OTP resent successfully." });
  } catch (error) {
    console.error("Error in resend-otp:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


const deliverOTP = async (user, emailFunction, req, res) => {
  const { otp, otpResponse } = await sendOtp(
    null,
    email = (user.role === 'alumni') ? user.personalEmail : user.universityEmail,
    user._id,
    user.name
  );
  if (!otpResponse) {
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
  // console.log("otp", otp, otpResponse);
  const datas = {
    name: user.name,
    email: user.role === 'alumni' ? user.personalEmail : user.universityEmail,
    otp,
  };
  emailFunction(datas, req, res)
}



router.post("/register-resend-otp", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "Id is required." });
  }

  try {
    const query = userId;


    console.log("HERE", query)
    // Find the existing OTP entry
    const otpEntry = await OTP.findOne({ ref: query }, { used: false });

    if (!otpEntry) {
      return res
        .status(404)
        .json({ message: "No OTP found for the provided details." });
    }

    console.log(`Cooldown period in seconds: ${OTP_COOLDOWN_PERIOD}`, moment.duration(OTP_COOLDOWN_PERIOD).asSeconds());
    console.log(`Cooldown period in minutes:`, moment.duration(OTP_COOLDOWN_PERIOD).asMinutes());

    // Check if the resend limit has been exceeded
    if (otpEntry.resendCount >= OTP_RESEND_LIMIT) {
      return res.status(203).json({
        error:
          `You have reached the maximum resend limit. Please Re-signup`,
      });
    }

    // Check if cooldown period has passed
    const timeSinceLastResent = moment().diff(
      moment(otpEntry.lastResentAt),
      "seconds"
    );
    if (timeSinceLastResent < OTP_COOLDOWN_PERIOD / 1000) {
      const secondsLeft = Math.ceil(
        OTP_COOLDOWN_PERIOD / 1000 - timeSinceLastResent
      );
      return res.status(429).json({
        message: `Please wait ${secondsLeft} seconds before resending OTP.`,
      });
    }

    // Generate a new OTP
    const newOtp = generateOtp6Digit();

    // Update the OTP entry
    otpEntry.otp = newOtp;
    otpEntry.otpExpiration = moment().add(2, "minutes"); // 2 minutes validity
    otpEntry.resendCount += 1;
    otpEntry.lastResentAt = moment();
    await otpEntry.save();

    const datas = {
      name: otpEntry.refName,
      email: otpEntry.email,
      otp: otpEntry.otp,
      subject: "Retry OTP"
    };

    // Send the OTP to the user
    resendEmailAccountConfirmation(datas, req, res);


    res.status(200).json({ message: "OTP resent successfully." });
  } catch (error) {
    console.error("Error in resend-otp:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



module.exports = router;










































async function newSession(req, res) {
  // console.log("Req user:", req.session.user)
  // console.log("The session data is in session ", req.session)
  if (req.session.user) {
    res.status(200).json({
      _id: req.session.user._id,
      name: req.session.user.name,
      email: req.session.user.email,
      username: req.session.user.username,
      profile: req.session.user.profile,
      university: req.session.user.university,
      super_role: req.session.user.super_role,
      role: req.session.user.role,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}
// router.post("/register", async (req, res) => {
//   const { name, email, password, universityId, campusId, role } = req.body;
//   let user;
//   let query;

//   console.log(email, password, universityId, campusId, role);
//   try {
//     if (!name) return res.status(302).json({ error: "name is required" });

//     if (isValidEduEmail(email)) {
//       //make it check that .edu comes after @ and no two @ exists
//       query = { universityEmail: email };
//     } else {
//       query = {
//         $or: [{ personalEmail: email }, { secondaryPersonalEmail: email }],
//       };
//     }

//     console.log(query);

//     if (universityId && campusId) {
//       query.$and = [
//         // query, // Include to the existing $or condition
//         {
//           "university.universityId": universityId,
//           "university.campusId": campusId,
//         },
//       ];
//     }
//     if (
//       !universityId &&
//       !campusId &&
//       (user.role === "student" ||
//         user.role === "teacher" ||
//         user.role === "alumni")
//     ) {
//       return res.status(404).json("References not found");
//     }

//     console.log("later", query);
//     user = await User.findOne(query);

//     if (user) return res.status(400).json("Registered?"); // already registered
//     console.log("No", user);
//     if (
//       (role === "student" || role === "teacher") &&
//       (user?.personalEmail || user?.secondaryPersonalEmail)
//     )
//       return res.status(400).json("Registered?");
//     console.log("here");

//     if (!(role === "ext_org")) {
//       const uniExists = await University.findOne({ _id: universityId });

//       if (!uniExists)
//         return res.status(404).json("Hmm.. Seems Odd, this should not happen"); // not registered

//       const campus = await Campus.findOne({
//         _id: campusId,
//         universityOrigin: universityId,
//       });

//       console.log(campus);
//       if (!campus)
//         return res.status(404).json("Hmm.. Seems Odd, this should not happen"); // not registered

//       const emailPatterns = campus.emailPatterns.studentPatterns.map(
//         (pattern) => pattern.replace(/\d+/g, "\\d+")
//       );

//       const combinedPattern = `^(${emailPatterns.join("|")})$`;
//       const regex = new RegExp(combinedPattern);
//       const isEmailValid = regex.test(email);
//       console.log(emailPatterns);
//       // const isEmailValid = emailPatterns.some(pattern => new RegExp(pattern).test(universityEmail));
//       console.log("Valid", isEmailValid);

//       if (!isEmailValid) {
//         // TODO Send report to moderator and superadmin
//         return res
//           .status(400)
//           .json("University email does not match the required format!");
//       }

//       const hashedPassword = await bcryptjs.hash(password, 10);

//       const newUser = new User({
//         name: name,
//         username: await createUniqueUsername(name),
//         password: hashedPassword,
//         university: {
//           universityId: universityId,
//           campusId: campusId,
//         },
//         role: role,
//         super_role: "none",
//       });
//       role === "alumni"
//         ? (newUser.personalEmail = email)
//         : (newUser.universityEmail = email);

//       await newUser.save();

//       campus.users.push(newUser._id);
//       uniExists.users.push(newUser._id);

//       await campus.save();
//       await uniExists.save();
//     } else {
//       const hashedPassword = await bcryptjs.hash(password, 10);
//       console.log("here2");
//       const newUser = new User({
//         name: name,
//         username: createUniqueUsername(name),
//         password: hashedPassword,
//         personalEmail: email,
//         role: role,
//         super_role: "none",
//       });
//       await newUser.save();

//       console.log("here3");
//     }

//     return res.status(201).json({ message: "Registration successful!" });
//   } catch (error) {
//     console.error("Error in ", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

