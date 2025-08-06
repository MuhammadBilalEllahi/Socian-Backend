const jwt = require("jsonwebtoken");
const moment = require('moment');
const {UserRoles} = require("models/userRoles");


// function omit(obj, keys = []) {
//   const copy = { ...obj };
//   for (const key of keys) {
//     delete copy[key];
//   }
//   return copy;
// }
function sanitizeProfile(profile = {}) {
  const sanitized = { ...profile };

  delete sanitized?.papersUploaded;
  delete sanitized?.papersUploaded?.pictureList;

  if (sanitized?.studentOrAlumniDocument?.images) {
    delete sanitized?.studentOrAlumniDocument?.images;
  }

  return sanitized;
}


// Helper function to generate tokens
const generateToken = (user) => {
    // const slimProfile = omit(user?.profile || {}, ['pictureList']);
  // const slimProfile = sanitizeProfile(user.profile);


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
    // joinedSocieties: user.subscribedSocities,
    // joinedSubSocieties: user.subscribedSubSocities,
    verified: user.universityEmailVerified,
    requiresMoreInformation: user.requiresMoreInformation ?? false,
    // isAlumniAndRequiresDocumentation: user.isAlumniAndRequiresDocumentation ?? false,
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

  if(user.role === UserRoles.alumni) {
    payload.verification={
      studentCardUploaded: user?.profile?.studentOrAlumniDocument?.available ?? false,
      livePictureUploaded: user?.profile?.livePicture?.available ?? false,
    }
  }
  if (user.role === UserRoles.teacher) {
    payload.teacherConnectivities = {
      attached: user?.teacherConnectivities?.attached ?? false,
      teacherModal: user?.teacherConnectivities?.teacherModal ?? null
    }
  }
  console.log("TOKEN ", JSON.stringify(payload, null, 2))
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
