const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../../../models/user/user.model');
const { platformSessionOrJwt_CALL_on_glogin_only, platformJwt_CALL_on_glogin_only } = require('../../../utils/platform/jwt.session.platform');
const Campus = require('../../../models/university/campus.university.model');
const UserRoles = require('../../../models/userRoles');
const { json } = require('body-parser');
const NonUniversityEmail = require('../../../models/non_uni/NonUni.model');
const router = express.Router();



async function getUserData(access_token, user, req, res) {

    // console.log("%c THIS IS USER", user, "background: red; color: green; padding: 5px; border-radius: 3px;");


    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    // console.log("Access Token", access_token)
    // console.log('response', response);

    // if (!response) return res.status(response.response.status).json({ error: response.response.statusText })

    const data = await response.json();
    // console.log('data', data);
    // console.log('data2', data.email, data.email_verified);

    const email = data.email;

    let query = {
        $or: [
            { universityEmail: email },
            { personalEmail: email },
            { secondaryPersonalEmail: email },
        ],
    };

    const userInDatabase = await User.findOne(query);


    // console.log("USer in google", userInDatabase, "RE", userInDatabase.requiresMoreInformation);

    if (userInDatabase && userInDatabase.requiresMoreInformation) {
        await userInDatabase.populate([
            { path: "university.universityId", select: "-users _id" },
            { path: "university.campusId", select: "-users _id" },
        ]);

        return platformSessionOrJwt_CALL_on_glogin_only(userInDatabase, req, res, { requiresMoreInformation: true })


    }
    else if (userInDatabase) {
        await userInDatabase.populate([
            { path: "university.universityId", select: "-users _id" },
            { path: "university.campusId", select: "-users _id" },
            { path: "university.departmentId", select: "name _id" },
        ]);

        return platformSessionOrJwt_CALL_on_glogin_only(userInDatabase, req, res)
        // return 200;

    }
    else {
        const campusList = await Campus.find({}, "emailPatterns universityOrigin"); // Fetch only emailPatterns field

        let isUniversityStudent = false;
        let isUniversityTeacher = false;
        let theCampusUserIsIn = null;

        for (const campus of campusList) {
            if (campus.emailPatterns?.regex && new RegExp(campus.emailPatterns.regex).test(email)) {
                isUniversityStudent = true;
                theCampusUserIsIn = campus;
                break;
            } else if (campus.emailPatterns?.domain && email.split("@")[1] === campus.emailPatterns.domain) {
                isUniversityTeacher = true;
                theCampusUserIsIn = campus;
            }
        }

        if ((isUniversityStudent || isUniversityTeacher) && theCampusUserIsIn) {
            // console.log("Email matches a university pattern.");
            // console.log("Campus User Is In:", theCampusUserIsIn);

            const baseUsername = data.email.split("@")[0]; // Use name or email prefix
            username = await generateUniqueUsername(baseUsername);


            const newUser = await User.create({
                requiresMoreInformation: true,
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
                // role: "no_access",
                role: isUniversityTeacher ? UserRoles.teacher : isUniversityStudent && UserRoles.student,
                restrictions: { approval: { isApproved: true } },
            });

            const addUserToCampus = await Campus.findByIdAndUpdate(theCampusUserIsIn._id, {
                $push: {
                    users: newUser._id
                }
            })

            if (!newUser) return { error: "User could not be created", status: 422 };

            await newUser.populate([
                { path: "university.universityId", select: "-users _id" },
                { path: "university.campusId", select: "-users _id" },
            ]);

            return platformSessionOrJwt_CALL_on_glogin_only(newUser, req, res, { requiresMoreInformation: true })

            // return res.status(200).json({ message: "Valid university email", user: newUser });
        } else {
            console.info("Email does not match any university pattern.");
            const addNonUniMailToDB = await NonUniversityEmail.create({
                email: data?.email,
                sub: data?.sub,
                name: data?.name,
                given_name: data?.given_name,
                family_name: data?.family_name,
                picture: data?.picture,
                email_verified: data?.email_verified,
            })
            return { redirect: 'notUniversityMail', status: 409, message: "Invalid university email" };
        }

    }

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
        const response = await getUserData(oAuth2Client.credentials.access_token, user, req, res);
        if (response?.redirect) {
            return res.redirect(303, `${process.env.FRONTEND_URL}/${response.redirect}`)

        }

        // return res.status(response.status).json(response)
        // .redirect(303, `${process.env.FRONTEND_URL}/authorizing`)



        res.redirect(303, `${process.env.FRONTEND_URL}/authorizing`);



    } catch (err) {
        console.error('Error logging in with OAuth2 user', err);
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

        // console.log(process.env.CLIENT_ID,  process.env.CLIENT_SECRET,)




        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            // access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.profile   openid ', 'https://www.googleapis.com/auth/userinfo.email   openid '],
            // prompt: 'consent',
            // hd: "cuilahore.edu.pk"
        });

        // console.log("Auth url: ", authorizeUrl)

        res.json({ url: authorizeUrl })
    } catch (error) {
        console.error("Error Loggin In with Google", error);
        res.status(500).json({ error: "Internal Server Error" })

    }
})







// Mobile Google Login Route
router.post("/google/mobile", async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ error: "ID Token required" });

        const client = new OAuth2Client(process.env.CLIENT_ID);

        // Verify Google ID Token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.CLIENT_ID,
        });

        // console.log("PAYLODTICKET", ticket)

        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // Check if user exists in MongoDB
        let user = await User.findOne({
            $or: [
                { universityEmail: email },
                { personalEmail: email },
                { secondaryPersonalEmail: email },
            ],
        });
        // console.log("IS EXISTS", user)

        if (!user) {
            // Check university email pattern
            const campusList = await Campus.find({}, "emailPatterns universityOrigin");
            let isUniversityStudent = false;
            let isUniversityTeacher = false;
            let theCampusUserIsIn = null;

            for (const campus of campusList) {
                if (campus.emailPatterns?.regex && new RegExp(campus.emailPatterns.regex).test(email)) {
                    isUniversityStudent = true;
                    theCampusUserIsIn = campus;
                    break;
                } else if (campus.emailPatterns?.domain && email.split("@")[1] === campus.emailPatterns.domain) {
                    isUniversityTeacher = true;
                    theCampusUserIsIn = campus;
                }
            }

            if (theCampusUserIsIn) {
                const username = email.split("@")[0];
                user = new User({
                    universityEmail: email,
                    username,
                    name,
                    university: {
                        universityId: theCampusUserIsIn.universityOrigin,
                        campusId: theCampusUserIsIn._id
                    },
                    role: isUniversityTeacher ? UserRoles.teacher : UserRoles.student,
                    universityEmailVerified: true,
                    google_EmailVerified: true,
                    requiresMoreInformation: true,
                });

                await user.save();

                const newSession = await platformJwt_CALL_on_glogin_only(user, req, res);

                // console.log("newSession", newSession)
                res.status(newSession.status).json({ token: newSession.tokens, newUser: true })
            } else {
                return res.status(409).json({ error: "Invalid university email" });
            }
        }

        if (!user) return res.status(204).json({ message: "No User - Test mode" })

        const newSession = await platformJwt_CALL_on_glogin_only(user, req, res);
        // console.log("newSession", newSession)
        res.status(newSession.status).json({ token: newSession.tokens, newUser: false })
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;


module.exports = router;