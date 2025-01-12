const path = require('path');
const fs = require('fs');
const multer = require('multer');

const tempStore = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const tempDir = path.join(__dirname, "..", 'data', 'uploads', 'temp');
            fs.mkdirSync(tempDir, { recursive: true });

            return cb(null, tempDir)
        },
        filename: function (req, file, cb) {

            return cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);

        }
    })
}).fields([{ name: 'banner', maxCount: 1 }, { name: 'icon', maxCount: 1 }]);

const uploadCommunityImages = (communityId, files) => {
    return new Promise((resolve, reject) => {
        try {
            const communityDir = path.join(__dirname, "..", 'data', 'uploads', 'community', communityId.toString());

            const bannerDir = path.join(communityDir, 'banner');
            const iconDir = path.join(communityDir, 'icon');

            fs.mkdirSync(bannerDir, { recursive: true });
            fs.mkdirSync(iconDir, { recursive: true });


            if (files['banner']) {
                const bannerFile = files['banner'][0];
                const newBannerPath = path.join(bannerDir, bannerFile.filename);
                fs.renameSync(bannerFile.path, newBannerPath);
            }
            if (files['icon']) {
                const iconFile = files['icon'][0];

                const newIconPath = path.join(iconDir, iconFile.filename);
                fs.renameSync(iconFile.path, newIconPath);
            }

            // Object.values(files).forEach(fileArray => {
            //     fileArray.forEach(file => {
            //         fs.unlinkSync(file.path);
            //     });
            // });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};







const tempStorePosts = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const tempDir = path.join(__dirname, "..", 'data', 'uploads', 'temp', 'posts');
            fs.mkdirSync(tempDir, { recursive: true });

            return cb(null, tempDir)
        },
        filename: function (req, file, cb) {

            return cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);

        }
    })
}).fields([{ name: 'media', maxCount: 1 }]);

module.exports = { uploadCommunityImages, tempStore, tempStorePosts }
