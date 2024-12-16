const jwt = require("jsonwebtoken");

// Helper function to generate tokens
const generateToken = (user) => {
  console.log("suer", user);
  const payload = {
    _id: user._id,
    name: user.name,
    email:
      user?.universityEmail ||
      user?.personalEmail ||
      user?.secondaryPersonalEmail,
    username: user.username,
    profile: user.profile,
    university: (user.role !== 'ext_org') ? user.university : undefined,
    super_role: user.super_role,
    role: user.role,
    references: {
      university: {
        name: user.university.universityId.name,
        _id: user.university.universityId._id,
      },
      campus: {
        name: user.university.campusId.name,
        _id: user.university.campusId._id,
      },
    },
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY_TIME,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY_TIME,
  });

  return { accessToken, refreshToken };
};

module.exports = generateToken;
