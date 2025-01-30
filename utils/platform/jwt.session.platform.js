const UserRoles = require("../../models/userRoles");
const generateToken = require("../generate.token");
const moment = require('moment');

const platformSessionOrJwt_CALL_on_glogin_only = async (user, req, res) => {
    try {

        // if (platform === "app") {

        //     const { accessToken, refreshToken } = generateToken(user);

        //     user.tokens = {
        //         access_token: accessToken,
        //         refresh_token: refreshToken,
        //     };
        //     await user.save();
        //     // console.log("in app", token);

        //     // Send JWT to the client
        //     res.status(200).json({
        //         access_token: accessToken,
        //         refresh_token: refreshToken,
        //     });
        // } else if (platform === "web") {
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
            // joinedSocieties: user.subscribedSocities,
            // joinedSubSocieties: user.subscribedSubSocities,
        };
        if (user.role === UserRoles.teacher) {
            req.session.user.teacherConnectivities = {
                attached: user?.teacherConnectivities?.attached ?? false,
                teacherModal: user?.teacherConnectivities?.teacherModal ?? null
            }
        }

        // console.log("User in WEB", req.session.user);

        // req.session.references = {
        //     university: {
        //         name: user.university.universityId.name,
        //         _id: user.university.universityId._id,
        //     },
        //     campus: {
        //         name: user.university.campusId.name,
        //         _id: user.university.campusId._id,
        //     },
        // };

        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            // console.log("Session user in Longin Controller : ", req.session.user)
        });

        // console.log(req.session.references);
        // res.setHeader("Authorization", `Bearer ${token}`);

        // return res.status(200).json(req.session.user);


        // } 
        // else {
        //     return res.status(400).json({ error: "Invalid platform" });
        // }
    } catch (error) {
        console.error("Internal server error ", error)
        return res.status(500).json({ error: "Internal Server Error" });

    }

}

module.exports = { platformSessionOrJwt_CALL_on_glogin_only }