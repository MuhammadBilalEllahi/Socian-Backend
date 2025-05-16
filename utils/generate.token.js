const jwt = require("jsonwebtoken");
const moment = require('moment');
const UserRoles = require("../models/userRoles");

// Helper function to generate tokens
const generateToken = (user) => {
  console.log("\nuser\n", user, "\n\n");
  const payload = {
    _id: user._id,
    name: user.name,
    email:
      user?.universityEmail ||
      user?.personalEmail ||
      user?.secondaryPersonalEmail,

    universityEmail: user?.universityEmail ?? '',
    personalEmail: user?.personalEmail ?? '',
    secondaryPersonalEmail: user?.secondaryPersonalEmail ?? '',

    username: user.username,
    profile: user.profile,
    university: (user.role !== 'ext_org') ? {
      universityId: {
        name: user.university.universityId.name,
        _id: user.university.universityId._id,
      },
      campusId: {
        name: user.university.campusId.name,
        _id: user.university.campusId._id,
      },
      departmentId: {
        name: user.university.departmentId.name,
        _id: user.university.departmentId._id,
      },
    } : undefined,
    super_role: user.super_role,
    role: user.role,
    joined: moment(user.createdAt).format('MMMM DD, YYYY'),
    joinedSocieties: user.subscribedSocities,
    joinedSubSocieties: user.subscribedSubSocities,
    verified: user.universityEmailVerified,
    requiresMoreInformation: user.requiresMoreInformation ?? false,
    changedDepartmentOnce: user?.changedDepartmentOnce ?? false,
    changedGraduationYearOnce: user?.changedGraduationYearOnce ?? false,
    references: {
      university: {
        name: user.university.universityId.name,
        _id: user.university.universityId._id,
      },
      campus: {
        name: user.university.campusId.name,
        _id: user.university.campusId._id,
      },
      department: {
        name: user.university.departmentId.name,
        _id: user.university.departmentId._id,
      },
    },
  };

  if (user.role === UserRoles.teacher) {
    payload.teacherConnectivities = {
      attached: user?.teacherConnectivities?.attached ?? false,
      teacherModal: user?.teacherConnectivities?.teacherModal ?? null
    }
  }
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY_TIME,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY_TIME,
  });

  console.log("completed\n\n", payload);

  return { accessToken, refreshToken };
};

module.exports = generateToken;
