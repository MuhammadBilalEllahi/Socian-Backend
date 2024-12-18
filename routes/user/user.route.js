const express = require('express')
const User = require('../../models/user/user.model')
const router = express.Router()
const moment = require('moment')

// No create user search field


// Search a user for profile page
router.get('/profile', async (req, res) => {
    try {
        console.log("here", req.query.id, req.params.id)

        // 67629d6fe10288ec95375ee0
        const userExists = await User.findById({ _id: req.query.id }).select("-password")
            .populate({
                path: 'profile.posts',
                model: 'Post',
                populate: [{
                    path: 'author',
                    select: 'name username profile'
                },
                {
                    path: 'voteId',
                },
                {
                    path: 'society',
                    select: 'name _id'
                }


                ],
                options: { sort: { createdAt: -1 } }
            })
        console.log("user>", userExists)
        if (!userExists) return res.status(404).json({ message: "User Not Found", error: "User Not Found" })

        console.log("use>>>", userExists.profile.posts)


        const user = {
            _id: userExists._id,
            name: userExists.name,
            email:
                userExists?.universityEmail ||
                userExists?.personalEmail ||
                userExists?.secondaryPersonalEmail,
            username: userExists.username,
            profile: userExists.profile,
            university: (userExists.role !== 'ext_org') ? userExists.university : undefined,
            super_role: userExists.super_role,
            role: userExists.role,
            joined: moment(userExists.createdAt).format('MMMM DD, YYYY'),
            // joinedSocieties: userExists.subscribedSocities,
            // joinedSubSocieties: userExists.subscribedSubSocities,
            verified: userExists.universityEmailVerified,
            // posts: userExists.posts,
            // references: {
            //   university: {
            //     name: userExists.university.universityId.name,
            //     _id: userExists.university.universityId._id,
            //   },
            //   campus: {
            //     name: userExists.university.campusId.name,
            //     _id: userExists.university.campusId._id,
            //   },
            // },
        };


        console.log("use>>", user)
        return res.status(200).json(user)
    } catch (error) {
        console.log("Error", error)
        res.status(500).json("Internal Server Error")
    }
})






module.exports = router