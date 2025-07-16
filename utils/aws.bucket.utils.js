 const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getUserDetails } = require('./utils');



const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// const generatePresignedUrl = async (bucketName, key) => { nah this is one time stuff
//     try {
//         const command = new GetObjectCommand({
//             Bucket: bucketName,
//             Key: key,
//         });

//         const url = await getSignedUrl(s3Client, command, { expiresIn: 2 * 3600 });
//         return url;
//     } catch (err) {
//         console.error('Error generating presigned URL:', err);
//         throw err;
//     }
// };

const uploadToS3 = async (filePath, bucketName, key, ContentType) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
            ContentType: ContentType,
            ACL: "public-read-write" //give ACL access in aws website
        };

        const command = new PutObjectCommand(params);
        const response = await s3Client.send(command);

        return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (err) {
        console.error('Error uploading file to S3:', err);
        throw err;
    }
};

const uploadToS3FromMemory = async (filePath, bucketName, key, ContentType) => {
    try {
        const fileContent = filePath;

        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
            ContentType: ContentType,
            ACL: "public-read-write" //give ACL access in aws website
        };

        const command = new PutObjectCommand(params);
        const response = await s3Client.send(command);

        return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (err) {
        console.error('Error uploading file to S3:', err);
        throw err;
    }
};


/**
 * 
 * @param {society_or_subSociety_id} society_or_subSociety_id This is soicey id or subscoiety id
 * @param {*} file the file in which content is
 * @param {*} req request
 * @param {*} isSubCommunity falsy by default
 * @returns url where data is stored
 */
const uploadPostMedia = async (society_or_subSociety_id, file, req, isSubCommunity = false) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName,)
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/${role}/${isSubCommunity ? 'sub_' : ''}society/${society_or_subSociety_id}/posts/${Date.now()}-${userId}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};


const uploadAdminPostMedia = async ( file, req) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName,)
    const { userId,  super_role } = getUserDetails(req);
    const{campusOrigin, universityOrigin}=req.body;
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, super_role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/${super_role}/posts/${Date.now()}-${userId}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};

const uploadCommunityImages = async (communityId, files) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    try {
        let bannerUrl = null;
        let iconUrl = null;

        if (files['banner']) {
            const bannerFile = files['banner'][0];
            const bannerKey = `community/${communityId}/banner/${Date.now()}-${bannerFile.filename}`;
            bannerUrl = await uploadToS3(bannerFile.path, bucketName, bannerKey, 'image/jpeg');
        }

        if (files['icon']) {
            const iconFile = files['icon'][0];
            const iconKey = `community/${communityId}/icon/${Date.now()}-${iconFile.filename}`;
            iconUrl = await uploadToS3(iconFile.path, bucketName, iconKey, 'image/jpeg');
        }

        return { bannerUrl, iconUrl };
    } catch (error) {
        console.error('Error uploading images to S3 by CommunityImages:', error);
        throw error;
    }
};

const uploadSubCommunityImages = async (subCommunityId, files) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    try {
        let bannerUrl = null;
        let iconUrl = null;

        if (files['banner']) {
            const bannerFile = files['banner'][0];
            const bannerKey = `sub_community/${subCommunityId}/banner/${Date.now()}-${bannerFile.filename}`;
            bannerUrl = await uploadToS3(bannerFile.path, bucketName, bannerKey, 'image/jpeg');
        }

        if (files['icon']) {
            const iconFile = files['icon'][0];
            const iconKey = `sub_community/${subCommunityId}/icon/${Date.now()}-${iconFile.filename}`;
            iconUrl = await uploadToS3(iconFile.path, bucketName, iconKey, 'image/jpeg');
        }

        return { bannerUrl, iconUrl };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    }
};



const uploadPictureMedia = async (file, req) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/${role}/${userId}/pictures/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};




const uploadBothCardMedia = async (file, req, isFront = true) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/${role}/${userId}/pictures/card/${isFront ? 'front' : 'back'}/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};


const uploadLivePictureMedia = async (file, req) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/${role}/${userId}/pictures/live/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};


const uploadTeacherPictureMedia = async (file, req) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const {email, universityOrigin, campusOrigin,  } = req.body;
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, )

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/teacher/${email}/pictures/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};




const uploadSocietyBanner = async (file, req, societyId) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/societies/${societyId}/banner/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", mediaUrl)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};
const uploadSocietyIcon = async (file, req, societyId) => {
    const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
    console.log("Bucker", bucketName);
    const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
    console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)

    try {
        let mediaUrl = null;


        if (file) {
            const mediaFile = file;
            console.log("This is media file: ", mediaFile)
            const mediaKey = `${universityOrigin}/${campusOrigin}/societies/${societyId}/icon/${Date.now()}-${mediaFile.originalname}`;
            mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
            console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)

        }

        console.log("THIS IS MEDIA UL", mediaUrl)

        return { url: mediaUrl, type: file.mimetype };
    } catch (error) {
        console.error('Error uploading images to S3 by SubCommunityImages:', error);
        throw error;
    } finally {
        if (file) {
            const mediaFile = file;
            console.log("UnLinking: ", mediaFile)
            fs.unlinkSync(mediaFile.path)
        }
    }
};


const uploadVerifySocietyImageAws = async (file, req, societyId) => {
        const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
        console.log("Bucker", bucketName);
        const { userId, campusOrigin, universityOrigin, role } = getUserDetails(req);
        console.log("THIS IS MEDIA UL", userId, campusOrigin, universityOrigin, role)
    
        try {
            let mediaUrl = null;
    
    
            if (file) {
                const mediaFile = file;
                console.log("This is media file: ", mediaFile)
                const mediaKey = `${universityOrigin}/${campusOrigin}/societies/${societyId}/verification/${Date.now()}-${mediaFile.originalname}`;
                mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
                console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)
    
            }
    
            console.log("THIS IS MEDIA UL", mediaUrl)
    
            return { url: mediaUrl, type: file.mimetype };
        } catch (error) {
            console.error('Error uploading images to S3 by SubCommunityImages:', error);
            throw error;
        } finally {
            if (file) {
                const mediaFile = file;
                console.log("UnLinking: ", mediaFile)
                fs.unlinkSync(mediaFile.path)
            }
        }
    };
    

    

const uploadUniversityImageAws = async (file, req, univeristyId) => {
        const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
        console.log("FILE", file,univeristyId)
    
        try {
            let mediaUrl = null;
    
    
            if (file) {
                const mediaFile = file;
                // console.log("This is media file: ", mediaFile)
                const mediaKey = `universities/${univeristyId}/logo_picture/${Date.now()}-${mediaFile.originalname}`;
                mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
                // console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)
    
            }
    
            console.log("THIS IS MEDIA UL", mediaUrl)
    
            return { url: mediaUrl, type: file.mimetype };
        } catch (error) {
            console.error('Error uploading images to S3 by SubCommunityImages:', error);
            throw error;
        } finally {
            if (file) {
                const mediaFile = file;
                console.log("UnLinking: ", mediaFile)
                fs.unlinkSync(mediaFile.path)
            }
        }
    };


    const uploadCafeFoodItem = async (file, req ) => {
        const bucketName = process.env.AWS_S3_IMAGE_BUCKET_NAME;
        console.log("FILE", file)
    
        try {
            let mediaUrl = null;
    
    
            if (file) {
                const mediaFile = file;
                // console.log("This is media file: ", mediaFile)
                const mediaKey = `universities/cafe/fooditem/${Date.now()}-${mediaFile.originalname}`;
                mediaUrl = await uploadToS3(mediaFile.path, bucketName, mediaKey, mediaFile.mimetype);
                // console.log("THIS IS MEDIA BLAH", "\n", mediaFile.path, "\n", bucketName, "\n", mediaKey, "\n", req.body.contentType)
    
            }
    
            console.log("THIS IS MEDIA UL", mediaUrl)
    
            return { url: mediaUrl, type: file.mimetype };
        } catch (error) {
            console.error('Error uploading images to S3 by SubCommunityImages:', error);
            throw error;
        } finally {
            if (file) {
                const mediaFile = file;
                console.log("UnLinking: ", mediaFile)
                fs.unlinkSync(mediaFile.path)
            }
        }
    };
    





module.exports = {
    uploadCommunityImages,
    uploadSubCommunityImages,
    uploadPostMedia,
    uploadAdminPostMedia,
    uploadPictureMedia,
    uploadBothCardMedia,
    uploadLivePictureMedia,
    uploadTeacherPictureMedia,
    uploadSocietyBanner,
    uploadSocietyIcon,
    uploadVerifySocietyImageAws,
    uploadUniversityImageAws
};




// const AWS = require('aws-sdk');
// const fs = require('fs');
// const path = require('path');

// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const s3Client = new S3Client({ region: process.env.AWS_REGION });



// const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region:
// });


// const uploadToS3 = (filePath, bucketName, key) => {
//     return new Promise((resolve, reject) => {
//         fs.readFile(filePath, (err, data) => {
//             if (err) return reject(err);

//             const params = {
//                 Bucket: bucketName,
//                 Key: key,
//                 Body: data,
//                 ContentType: 'image/jpeg'
//             };

//             s3.upload(params, (err, data) => {
//                 if (err) return reject(err);
//                 resolve(data.Location);
//             });
//         });
//     });
// };

// const uploadCommunityImages = async (communityId, files) => {
//     const bucketName = process.env.AWS_S3_BUCKET_NAME;

//     try {
//         let bannerUrl = null;
//         let iconUrl = null;

//         if (files['banner']) {
//             const bannerFile = files['banner'][0];
//             const bannerKey = `community/${communityId}/banner/${Date.now()}-${bannerFile.filename}`;
//             bannerUrl = await uploadToS3(bannerFile.path, bucketName, bannerKey);
//         }

//         if (files['icon']) {
//             const iconFile = files['icon'][0];
//             const iconKey = `community/${communityId}/icon/${Date.now()}-${iconFile.filename}`;
//             iconUrl = await uploadToS3(iconFile.path, bucketName, iconKey);
//         }

//         return { bannerUrl, iconUrl };
//     } catch (error) {
//         console.error('Error uploading images to S3:', error);
//         throw error;
//     }
// };


// (node:7622) NOTE: The AWS SDK for JavaScript (v2) will enter maintenance mode
// on September 8, 2024 and reach end-of-support on September 8, 2025.

// Please migrate your code to use AWS SDK for JavaScript (v3).
// For more information, check blog post at https://a.co/cUPnyil
// (Use `node --trace-warnings ...` to show where the warning was created)
// module.exports = { uploadCommunityImages }