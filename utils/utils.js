const { OTP } = require("../models/otp/otp");
const User = require("../models/user/user.model");
const moment = require("moment");
const otpGenerator = require("otp-generator");
const bcryptjs = require('bcryptjs');
const generateToken = require("./generate.token");
const UserRoles = require("../models/userRoles")
/**
 * Generates a 6-digit OTP.
 * @returns {string} - A 6-digit OTP as a string.
 */
const generateOtp6Digit = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
};

/**
 * Generates a formatted date string in the format "Fri Nov 12 2021".
 * @returns {string} - The formatted date as a string.
 */
function createDateTime() {
  // Create a Date object for November 12, 2021
  const date = moment().format("ddd MMM DD YYYY");
  return date;
}

const generateUsername = (name) => {
  return name.replace(/\s+/g, "_"); // Replaces spaces with underscores
};

const generateRandomNumber = () => {
  return Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit number
};

const createUniqueUsername = async (name) => {
  let username = generateUsername(name);
  let finalUsername = username;

  // Check if the username exists in the database
  let user = await User.findOne({ username: finalUsername });

  // Loop until a unique username is found
  while (user) {
    // Username exists, so append a random 4-digit number
    const randomNumber = generateRandomNumber();
    finalUsername = `${username}${randomNumber}`;

    // Check if the newly generated username exists
    user = await User.findOne({ username: finalUsername });
  }

  // Return the unique username
  return finalUsername;
};

/**
 * Sends an OTP to the provided phone number or email.
 * @param {string} phoneNumber - Recipient's phone number.
 * @param {string} email - Recipient's email address.
 * @param {string} otp - The OTP to be sent.
 * @returns {Promise<object>} - Result of OTP send operation.
 */
const sendOtp = async (phoneNumber, email, user, name, purpose = "verify") => {
  console.log("DATA", phoneNumber, email, user, name);
  if (email && phoneNumber) {
    console.error("Cannot use both phone number and email.");
    return { error: "Cannot use both phone number and email." };
  }
  if (!email && !phoneNumber) {
    return { error: "Either phone number or email is required." };
  }
  const otp = generateOtp6Digit();
  const query = phoneNumber ? { phone: phoneNumber } : { email: email };
  const otpExpiration = moment().add(20, "minutes"); // 20 minutes expiry

  const hashedOTP = await bcryptjs.hash(otp, 10);

  // console.log("this query", query);
  const otpResponse = await OTP.findOneAndUpdate(
    query,
    {
      otp: hashedOTP,
      otpExpiration,
      used: false,
      pupose: purpose,
      ref: user,
      refName: name,
      resendCount: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { otp, otpResponse };
};






/**
 * This function has leading protectRoute, which checks if user is logged in or not
 * Extracts user details based on the platform and session or user data.
 * @param {Object} req - The request object
 * @returns {Object} - The user details, including  user, userId, role, universityOrigin, campusOrigin, departmentId
 * @returns {user}
 * @returns {userId}
 * @returns {role}
 * @returns {universityOrigin}
 * @returns {campusOrigin}
 */
const getUserDetails = (req) => {
try{

  // Validate `res` only if `checks` is true
  // if (checks && !res) {
  //   throw new Error("Response object (`res`) is required when `checks` is true");
  // }

  let name, user, userId, role, universityOrigin, campusOrigin, departmentId, super_role;

  const platform = req.headers["x-platform"];

  // console.log("this is the platform", platform, req.headers["x-platform"], req.user);
  if (platform === "web") {
    if(!req?.session?.user) {
      console.error("Session user is not defined");
      return {};
    }
    name = req.session.user.name;
    user = req.session.user;
    userId = req.session.user._id;
    role = req.session.user.role;
    if(req.session.user?.super_role){
      super_role= req.session.user.super_role
    }
    departmentId = req.session.user.university.departmentId?._id ?? req.session.user.university.departmentId;
    if (role !== "ext_org") {
      universityOrigin = req.session.user.university.universityId?._id ?? req.session.user.university.universityId;
      campusOrigin = req.session.user.university.campusId?._id ?? req.session.user.university.campusId;
    }
  } else if (platform === "app") {
    if(!req?.user) {
      console.error("Session user is not defined");
      return {};
    }
    name = req.user.name;
    user = req.user;
    userId = req.user._id;
    role = req.user.role;
     if(req.user?.super_role){
      super_role= req.user.super_role
    }
    departmentId = req.user.university.departmentId?._id ?? req.user.university.departmentId;
    if (role !== "ext_org") {
      universityOrigin = req.user.university.universityId?._id ?? req.user.university.universityId;
      campusOrigin = req.user.university.campusId?._id ?? req.user.university.campusId;
    }
  }
  let campusId = campusOrigin;
  let universityId = universityOrigin;

  // if (checks) {
  //   if (!userId) return res.status(400).json({ message: "User ID is missing" }); // This will never happen
  //   if (!role) return res.status(400).json({ message: "User role is missing" }); // This will never happen
  //   if (!departmentId) { // This will never happen (only for those who created an account already unitl Today 26th Jan 2025 )
  //     return res
  //       .status(422)
  //       .json({ message: "Please select a department in profile settings" });
  //   }
  // }

  return { name, user, userId, role, campusId, universityId, universityOrigin, campusOrigin, departmentId, platform, super_role };
}catch(e){  
  console.error("Error in getUserDetails:", e);
  return {}
};
}



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

    console.log("USER In HandlePlatformResponse", user)
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
      universityEmail: user?.universityEmail,
      personalEmail: user?.personalEmail,
      secondaryPersonalEmail: user?.secondaryPersonalEmail,

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








/**
 * Extracts cafe user details based on the platform and session or user data.
 * @param {Object} req - The request object
 * @returns {Object} - The user details, including  cafeUser, cafeUserId, role, universityId, campusId
 * @returns {user}
 * @returns {userId}
 * @returns {role}
 * @returns {universityId}
 * @returns {campusId}
 */
const getCafeUserDetails = (req) => {

  let cafeUser, cafeUserId, role, universityId, campusId;

  const platform = req.headers["x-platform"];

  if (platform === "web") {
    cafeUser = req.session.cafe.user;
    cafeUserId = req.session.cafe.user._id;
    role = req.session.cafe.user.role;
    if (role !== "ext_org") {
      universityId = req.session.cafe.user.references.universityId?._id ?? req.session.cafe.user.references.universityId;
      campusId = req.session.cafe.user.references.campusId?._id ?? req.session.cafe.user.references.campusId;
    }
  } else if (platform === "app") {
    cafeUser = req.cafe.user;
    cafeUserId = req.cafe.user._id;
    role = req.cafe.user.role;
    if (role !== "ext_org") {
      universityId = req.cafe.user.references.universityId?._id ?? req.cafe.user.references.universityId;
      campusId = req.cafe.user.references.campusId?._id ?? req.cafe.user.references.campusId;
    }
  }
  return { cafeUser, cafeUserId, role, universityId, campusId };
};

module.exports = {
  generateOtp6Digit,
  createDateTime,
  createUniqueUsername,
  sendOtp,
  getUserDetails,
  getCafeUserDetails,
  handlePlatformResponse
};
