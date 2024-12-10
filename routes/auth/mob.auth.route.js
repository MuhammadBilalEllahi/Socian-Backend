const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/user/user.model");

// router.post("/login", async (req, res) => {
//   let userRoleBool = false;
//   const { username, email, password } = req.body;

//   // Check if user exists
//   const user = User.find({
//     $or: {
//       username: username,
//       universityEmail: email,
//       personalEmail: email,
//       secondaryPersonalEmail: email,
//     },
//   });
//   if (!user) {
//     return res.status(401).json({ message: "Invalid username or password" });
//   }

//   // Verify password
//   const isPasswordValid = bcrypt.compare(password, user.password);
//   if (!isPasswordValid) {
//     return res.status(401).json({ message: "Invalid username or password" });
//   }

//   if (
//     user.role === "student" ||
//     user.role === "alumni"
//     // user.role === 'teacher'
//   ) {
//     userRoleBool = true;
//   }
//   // Create JWT
//   const token = jwt.sign(
//     {
//       _id: user._id,
//       name: user.name,
//       email:
//         user.universityEmail ||
//         user.personalEmail ||
//         user.secondaryPersonalEmail,
//       username: user.username,
//       profile: user.profile,
//       university: userRoleBool ? user.university : undefined,
//       super_role: user.super_role,
//       role: user.role,
//       references: {
//         university: {
//           name: user.university.universityId.name,
//           _id: user.university.universityId._id,
//         },
//         campus: {
//           name: user.university.campusId.name,
//           _id: user.university.campusId._id,
//         },
//       },
//     },
//     JWT_SECRET,
//     { expiresIn: JWT_EXPIRY_TIME }
//   );

//   // Send JWT to the client
//   res.json({ token });
// });

module.exports = router;
