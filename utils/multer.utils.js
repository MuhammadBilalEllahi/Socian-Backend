const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getUserDetails } = require("./utils");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { universityOrigin, campusOrigin, role, userId } = getUserDetails(req);
        console.log(universityOrigin, campusOrigin, role, userId)

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            role,
            userId,
            "posts"
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});


const AdminPostStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const {universityOrigin, campusOrigin,}= req.body;
        const {  super_role, userId } = getUserDetails(req);
        console.log(universityOrigin, campusOrigin, super_role, userId)

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            ...[universityOrigin, campusOrigin, super_role, userId, 'posts'].filter(Boolean) 
            // universityOrigin,
            // campusOrigin,
            // role,
            // userId,
            // "posts"
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const adminPostUpload = multer({
    storage: AdminPostStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});




const ImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { universityOrigin, campusOrigin, role, userId } = getUserDetails(req);
        console.log(universityOrigin, campusOrigin, role, userId)

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            role,
            userId,
            "pictures"
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadImage = multer({
    storage: ImageStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});




const TeacherImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { email, universityOrigin, campusOrigin, } = req.body;
        console.log(universityOrigin, campusOrigin,)

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            "teacher",
            email,
            "pictures"
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadTeacherImage = multer({
    storage: TeacherImageStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});




const SocietyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { universityOrigin, campusOrigin, role, userId } = getUserDetails(req);
        console.log("REq", req.body)
        console.log("FILE", req.file)
        console.log("FILES", req.files)
        console.log("FILE-", file)
        const { societyId } = req.body;
        console.log("Socety", societyId)
        console.log(universityOrigin, campusOrigin, role, userId, societyId, "societyId")

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            role,
            "society",
            societyId

        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadSocietyImage = multer({
    storage: SocietyStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});


const CreateSocietyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { universityOrigin, campusOrigin, role, userId } = getUserDetails(req);
        console.log("REq", req.body)
        console.log("FILE", req.file)
        console.log("FILES", req.files)
        console.log("FILE-", file)
        console.log(universityOrigin, campusOrigin, role, userId,)

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            role,
            userId,
            "society"

        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadCreateSocietyImage = multer({
    storage: CreateSocietyStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});



const VerifySocietyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { universityOrigin, campusOrigin, role, userId } = getUserDetails(req);
        console.log("REq", req.body)
        console.log("FILE", req.file)
        console.log("FILES", req.files)
        console.log("FILE-", file)
        const { societyId } = req.body;
        console.log("Socety", societyId)
        console.log(universityOrigin, campusOrigin, role, userId, societyId, "societyId")

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            universityOrigin,
            campusOrigin,
            role,
            "society",
            societyId

        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadVerifySocietyImage = multer({
    storage: VerifySocietyStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});






const UniversityImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {

        const pathCWD = process.cwd();
        console.log("PATHHH", pathCWD);


        const uploadPath = path.join(
            pathCWD,
            'temp',
            "uploads",
            "universities",
            "pictures"
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        console.log("saved to destination", uploadPath)

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const uploadUniversityImage = multer({
    storage: UniversityImageStorage, limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB per file
    }
});





module.exports = {
    upload,
    adminPostUpload,
    uploadImage,
    uploadTeacherImage,
    uploadSocietyImage,
    uploadCreateSocietyImage,
    uploadVerifySocietyImage,
    uploadUniversityImage,
};



// const path = require('path');
// const fs = require('fs');
// const multer = require('multer');

// const tempStore = multer({
//     storage: multer.diskStorage({
//         destination: function (req, file, cb) {
//             const tempDir = path.join(__dirname, "..", 'data', 'uploads', 'temp');
//             fs.mkdirSync(tempDir, { recursive: true });

//             return cb(null, tempDir)
//         },
//         filename: function (req, file, cb) {

//             return cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);

//         }
//     })
// }).fields([{ name: 'banner', maxCount: 1 }, { name: 'icon', maxCount: 1 }]);

// const uploadCommunityImages = (communityId, files) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const communityDir = path.join(__dirname, "..", 'data', 'uploads', 'community', communityId.toString());

//             const bannerDir = path.join(communityDir, 'banner');
//             const iconDir = path.join(communityDir, 'icon');

//             fs.mkdirSync(bannerDir, { recursive: true });
//             fs.mkdirSync(iconDir, { recursive: true });


//             if (files['banner']) {
//                 const bannerFile = files['banner'][0];
//                 const newBannerPath = path.join(bannerDir, bannerFile.filename);
//                 fs.renameSync(bannerFile.path, newBannerPath);
//             }
//             if (files['icon']) {
//                 const iconFile = files['icon'][0];

//                 const newIconPath = path.join(iconDir, iconFile.filename);
//                 fs.renameSync(iconFile.path, newIconPath);
//             }

//             // Object.values(files).forEach(fileArray => {
//             //     fileArray.forEach(file => {
//             //         fs.unlinkSync(file.path);
//             //     });
//             // });

//             resolve();
//         } catch (error) {
//             reject(error);
//         }
//     });
// };







// const tempStorePosts = multer({
//     storage: multer.diskStorage({
//         destination: function (req, file, cb) {
//             const tempDir = path.join(__dirname, "..", 'data', 'uploads', 'temp', 'posts');
//             fs.mkdirSync(tempDir, { recursive: true });

//             return cb(null, tempDir)
//         },
//         filename: function (req, file, cb) {

//             return cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);

//         }
//     })
// }).fields([{ name: 'media', maxCount: 1 }]);

// module.exports = { uploadCommunityImages, tempStore, tempStorePosts }
