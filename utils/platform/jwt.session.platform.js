const UserRoles = require("../../models/userRoles");
const generateToken = require("../generate.token");
const moment = require('moment');

const platformSessionOrJwt_CALL_on_glogin_only = async (user, req, res) => {
    try {

        req.session.user = {
            _id: user._id,
            name: user.name,
            email:
                user.universityEmail ||
                user.personalEmail ||
                user.secondaryPersonalEmail,
            username: user.username,
            profile: user.profile,
            university: (user.role !== UserRoles.ext_org) ? user.university : undefined,
            super_role: user.super_role,
            role: user.role,
            verified: user.universityEmailVerified,
            joined: moment(user.createdAt).format('MMMM DD, YYYY'),
            requiresMoreInformation: user?.requiresMoreInformation ?? false

            // ...(Array.isArray(extra) ? extra[0] : extra)
        };
        if (user.role === UserRoles.teacher) {
            req.session.user.teacherConnectivities = {
                attached: user?.teacherConnectivities?.attached ?? false,
                teacherModal: user?.teacherConnectivities?.teacherModal ?? null
            }
        }

        // console.log("User in WEB", req.session.user);

        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            // console.log("Session user in Longin Controller : ", req.session.user)
        });


        // console.log(req.session.references);
        // res.setHeader("Authorization", `Bearer ${token}`);

        const isUserRequireINfo = user?.requiresMoreInformation ? 'complete/info' : '';

        return { newSession: req.session.user, status: 200, redirect: isUserRequireINfo };

        // return res.status(200).json({ newSession: req.session.user });

    } catch (error) {
        console.error("Internal server error ", error)
        return { status: 500, error: "Internal Server Error" };

    }

}



const platformJwt_CALL_on_glogin_only = async (user, req, res) => {
    try {

        const { accessToken, refreshToken } = generateToken(user);

        user.tokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
        await user.save();
        // console.log("in app", token);

        // Send JWT to the client
        const newSession = {
            status: 200,
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
            }
        };
        return newSession;

        // const isUserRequireINfo = user?.requiresMoreInformation ? 'complete/info' : '';

        // return { newSession: req.session.user, status: 200, redirect: isUserRequireINfo };



    } catch (error) {
        console.error("Internal server error ", error)
        return { status: 500, error: "Internal Server Error" };

    }

}

module.exports = { platformSessionOrJwt_CALL_on_glogin_only, platformJwt_CALL_on_glogin_only }