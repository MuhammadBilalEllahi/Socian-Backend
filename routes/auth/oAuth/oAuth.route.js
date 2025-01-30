const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../../../models/user/user.model');
const { platformSessionOrJwt_CALL_on_glogin_only } = require('../../../utils/platform/jwt.session.platform');
const Campus = require('../../../models/university/campus.university.model');
const router = express.Router();



async function getUserData(access_token, user, req, res) {

    console.log("%c THIS IS USER", "background: red; color: green; padding: 5px; border-radius: 3px;");


    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    // console.log("Access Token", access_token)
    // console.log('response', response);
    const data = await response.json();
    console.log('data', data);
    console.log('data2', data.email, data.email_verified);

    const email = data.email;

    let query = {
        $or: [
            { universityEmail: email },
            { personalEmail: email },
            { secondaryPersonalEmail: email },
        ],
    };

    const userInDatabase = await User.findOne(query);

    console.log("USer in google", userInDatabase);

    if (userInDatabase) {
        await userInDatabase.populate([
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

        platformSessionOrJwt_CALL_on_glogin_only(userInDatabase, req, res)
    }
    else {
        const campusList = await Campus.find({}, "emailPatterns universityOrigin"); // Fetch only emailPatterns field

        let isUniversityEmail = false;
        let theCampusUserIsIn = null;

        for (const campus of campusList) {
            if (campus.emailPatterns?.regex && new RegExp(campus.emailPatterns.regex).test(email)) {
                isUniversityEmail = true;
                theCampusUserIsIn = campus;
                break;
            }
        }

        if (isUniversityEmail && theCampusUserIsIn) {
            console.log("Email matches a university pattern.");
            console.log("Campus User Is In:", theCampusUserIsIn);

            const baseUsername = data.email.split("@")[0]; // Use name or email prefix
            username = await generateUniqueUsername(baseUsername);


            const newUser = await User.create({
                universityEmail: email,
                username,
                name: data.name,
                university: {
                    universityId: theCampusUserIsIn.universityOrigin,
                    campusId: theCampusUserIsIn._id
                },
                universityEmailVerified: true,
                google_EmailVerified: true,
                hd: data?.hd,
                role: "no_access",
                restrictions: { approval: { isApproved: true } },
            });

            const addUserToCampus = await Campus.findByIdAndUpdate(theCampusUserIsIn._id, {
                $push: {
                    users: newUser._id
                }
            })

            if (!newUser) return 0;
            await newUser.populate([
                { path: "university.universityId", select: "-users _id" },
                { path: "university.campusId", select: "-users _id" },
                // { path: "university.departmentId", select: "name _id" },
            ]);

            platformSessionOrJwt_CALL_on_glogin_only(newUser, req, res)
            // return res.status(200).json({ message: "Valid university email", user: newUser });
        } else {
            console.log("Email does not match any university pattern.");
            return res.status(400).json({ message: "Invalid university email" });
        }

    }

    return userInDatabase._id;

    // if (!(Boolean(universityEmail_UserDB || personalEmail_UserDB))) {

    //     const allowedDomains = ["cuilahore", "cuiislamabad", "cuiabbottabad"];
    //     const domainPattern = allowedDomains.join('|');
    //     const universityEmailRegex = new RegExp(`^(fa|sp)\\d{2}-(bcs|bse|baf|bai|bar|bba|bce|bch|bde|bec|bee|ben|bid|bmc|bph|bpy|bsm|bst|che|mel|pch|pcs|pec|pee|phm|pms|pmt|ppc|pph|pst|r06|rba|rch|rcp|rcs|rec|ree|rel|rms|rmt|rne|rph|rpm|rpy|rst)-\\d{3}@(${domainPattern})\\.edu\\.pk$`);

    //     if (!(universityEmailRegex.test(data.email))) {
    //         return res.status(422).json({ message: "Only Organizational Accounts are Allowed to Signup \nor Signup on /register/student-type" })
    //     }

    //     const emailDomainMatch = data.email.match(new RegExp(`@(${domainPattern})\\.edu\\.pk$`));
    //     let resultantLocation = ''
    //     if (emailDomainMatch) {
    //         const matchedDomain = emailDomainMatch[1];

    //         const val = matchedDomain.replace('cui', '')
    //         resultantLocation = val.charAt(0).toUpperCase() + val.slice(1)
    //         // console.log("Matched Domain:", resultantLocation);
    //     }

    //     const beforeDomain = data.email.split("@")[0]
    //     const emailDomain = data.email.split("@")[1]


    //     const username = await generateUsernameFromEmail(beforeDomain)

    //     const isUniversityMail = emailDomain === "cuilahore.edu.pk" || emailDomain === "cuiislamabad.edu.pk";
    //     const universityEmailExpirationDate = getExpirationDate(isUniversityMail, beforeDomain)

    //     const saltRound = await bcryptjs.genSalt(10)
    //     const hashedPassowrd = await bcryptjs.hash(beforeDomain + "" + username, saltRound)//give option to user to change it if needed otherwise never usable if uses google to signin

    //     const userCreate = new User({
    //         universityEmail: isUniversityMail ? data.email : null,
    //         personalEmail: isUniversityMail ? null : data.email,
    //         password: hashedPassowrd,
    //         name: data.name,
    //         universityEmailVerified: isUniversityMail,
    //         personalEmailVerified: !isUniversityMail,
    //         profilePic: data.picture,
    //         google_EmailVerified: data.email_verified,
    //         username: username,
    //         universityEmailExpirationDate: universityEmailExpirationDate,
    //         profile: {
    //             location: resultantLocation
    //         },

    //         access_token: user.access_token,
    //         token: user.id_token,
    //         refresh_token: user.refresh_token,

    //     })

    //     await userCreate.save()
    //     if (userCreate) {
    //         const datas = {
    //             name: data.name,
    //             email: data.email,
    //             subject: "Account Created!",
    //             message: "Thank You for Creating account in Comsats Colab",
    //             html: `
    //             <h2>Enjoy Your webapp, wanna secure it more?</p><br/> 
    //             <p>You have not created a password but we did create a username for you. Check it out in profile section.\n If you like, you could proceed using Google to Sign-in </p>
    //             <a href="${process.env.G_REDIRECT_URI}/login" >Login Comsian Account</a>
    //             `
    //         }
    //         await resendEmail(datas, req, res)


    //         req.session.user = {
    //             _id: userCreate._id,
    //             name: data.name,
    //             email: data.email,
    //             picture: data.picture,
    //             username: userCreate.username,

    //             access_token: user.access_token,
    //             token: user.id_token,
    //             refresh_token: user.refresh_token,

    //         };
    //         req.session.save((err) => {
    //             if (err) {
    //                 console.error('Session save error:', err);

    //             }
    //             // console.log("Session user in Longin Controller : ", req.session.user)

    //         });

    //         return userCreate._id
    //     }
    // } else {
    //     if (universityEmail_UserDB) {
    //         const mail = universityEmail_UserDB.universityEmail;

    //         const isVerified = await User.findOne({ universityEmail: mail }).select("google_EmailVerified universityEmailVerified name profilePic username")
    //         let response;
    //         if (isVerified.universityEmail) {
    //             response = await User.findOneAndUpdate({ universityEmail: mail }, {
    //                 access_token: user.access_token,
    //                 token: user.id_token,
    //                 refresh_token: user.refresh_token,
    //             }, { new: true, select: "-password" })


    //         } else {

    //             const beforeDomain = data.email.split("@")[0];
    //             const universityEmailExpirationDate = getExpirationDate(true, beforeDomain)

    //             const username = await generateUsernameFromEmail(beforeDomain)

    //             response = await User.findOneAndUpdate({ universityEmail: mail }, {
    //                 name: isVerified.name ? isVerified.name : data.name,
    //                 universityEmailVerified: true,
    //                 profilePic: (isVerified.profilePic && isVerified.profilePic !== "") ? isVerified.profilePic : data.picture,
    //                 google_EmailVerified: data.email_verified,
    //                 username: isVerified.username ? isVerified.username : username,
    //                 universityEmailExpirationDate: universityEmailExpirationDate,
    //                 universityEmail: isVerified.universityEmail ? isVerified.universityEmail : mail,

    //                 access_token: user.access_token,
    //                 token: user.id_token,
    //                 refresh_token: user.refresh_token,

    //             }, { new: true, select: "-password" })
    //         }


    //         req.session.user = {
    //             _id: response._id,
    //             name: data.name,
    //             email: data.email,
    //             picture: data.picture,
    //             username: response.username,

    //             access_token: user.access_token,
    //             token: user.id_token,
    //             refresh_token: user.refresh_token,

    //         };
    //         req.session.save((err) => {
    //             if (err) {
    //                 console.error('Session save error:', err);

    //             }
    //             // console.log("Session user in Longin Controller : ", req.session.user)

    //         });

    //         // console.log("Uni Email Already Signed Up: ", response)
    //         return response._id

    //     }
    //     if (personalEmail_UserDB) {
    //         const mail = personalEmail_UserDB.personalEmail;


    //         const isVerified = await User.findOne({ personalEmail: mail }).select("google_EmailVerified personalEmailVerified name profilePic username")
    //         let response;

    //         if (isVerified.personalEmail) {

    //             response = await User.findOneAndUpdate({ personalEmail: mail }, {
    //                 access_token: user.access_token,
    //                 token: user.id_token,
    //                 refresh_token: user.refresh_token,
    //             }, { new: true, select: "-password" })
    //         } else {
    //             const beforeDomain = data.email.split("@")[0];
    //             const username = await generateUsernameFromEmail(beforeDomain)

    //             response = await User.findOneAndUpdate({ personalEmail: mail }, {
    //                 name: isVerified.name ? isVerified.name : data.name,
    //                 personalEmailVerified: true,
    //                 profilePic: (isVerified.profilePic && isVerified.profilePic !== "") ? isVerified.profilePic : data.picture,
    //                 google_EmailVerified: data.email_verified,
    //                 username: isVerified.username ? isVerified.username : username,
    //                 personalEmail: isVerified.personalEmail ? isVerified.personalEmail : mail,

    //                 access_token: user.access_token,
    //                 token: user.id_token,
    //                 refresh_token: user.refresh_token,

    //             }, { new: true, select: "-password" })
    //         }

    //         req.session.user = {
    //             _id: response._id,
    //             name: data.name,
    //             email: data.email,
    //             picture: data.picture,
    //             username: response.username,

    //             access_token: user.access_token,
    //             token: user.id_token,
    //             refresh_token: user.refresh_token,

    //         };
    //         req.session.save((err) => {
    //             if (err) {
    //                 console.error('Session save error:', err);

    //             }
    //             // console.log("Session user in Longin Controller : ", req.session.user)

    //         });
    //         // console.log("Personal Email Already Signed Up: ", response)
    //         return response._id
    //     }

    // }

}

const generateUniqueUsername = async (baseUsername) => {
    let username = baseUsername.toLowerCase().replace(/\s+/g, ""); // Remove spaces
    let exists = await User.findOne({ username });

    let counter = 1;
    while (exists) {
        username = `${baseUsername}${counter}`; // Append a number
        exists = await User.findOne({ username });
        counter++;
    }
    return username;
};

async function retryOAuth2ClientGetToken(oAuth2Client, code, retries = 2, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await oAuth2Client.getToken(code);
            await oAuth2Client.setCredentials(r.tokens);
            return oAuth2Client.credentials;
        } catch (err) {
            // console.debug(`Attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw err;
            }
        }
    }
}


router.get('', async (req, res, next) => {

    const code = req.query.code;
    try {
        const redirectURL = `${process.env.FRONTEND_URL}/oauth`;

        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectURL
        );

        const user = await retryOAuth2ClientGetToken(oAuth2Client, code);
        // await oAuth2Client.setCredentials(r.tokens);
        // const user = oAuth2Client.credentials;
        const userId = await getUserData(oAuth2Client.credentials.access_token, user, req, res);
        if (userId?.statusCode === 422) return;


        res.redirect(303, `${process.env.FRONTEND_URL}/authorizing`);



    } catch (err) {
        console.error('Error logging in with OAuth2 user', err.message);
        if (err.code !== 'ERR_HTTP_HEADERS_SENT') {
            res.status(500).json({ "error": err.message })
        }


    }
});





// loginWithGoogle
router.post('/google/request', async (req, res, next) => {
    try {
        res.header("Access-Control-Allow-Origin", `${process.env.FRONTEND_URL}`);
        res.header("Access-Control-Allow-Credentials", 'true');
        res.header("Referrer-Policy", "no-referrer-when-downgrade");
        const redirectURL = `${process.env.FRONTEND_URL}/oauth`;

        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectURL
        );

        console.log(process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,)




        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            // access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.profile   openid ', 'https://www.googleapis.com/auth/userinfo.email   openid '],
            // prompt: 'consent',
            // hd: "cuilahore.edu.pk"
        });

        console.log("Auth url: ", authorizeUrl)

        res.json({ url: authorizeUrl })
    } catch (error) {
        console.error("Error Loggin In with Google", error);
        res.status(500).json({ error: "Internal Server Error" })

    }
})






module.exports = router;