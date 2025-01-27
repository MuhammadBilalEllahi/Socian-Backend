const express = require('express')
const User = require('../../models/user/user.model')
const router = express.Router()
const moment = require('moment')
const { getUserDetails } = require('../../utils/utils')
const { default: mongoose } = require('mongoose')
const Society = require('../../models/society/society.model')

// No create user search field


// // Search a user for profile page
// router.get('/profile', async (req, res) => {
//     try {
//         // console.log("here", req.query.id, req.params.id)

//         // 67629d6fe10288ec95375ee0
//         const userExists = await User.findById({ _id: req.query.id }).select("-password")
//             .populate([
//                 {
//                     path: 'subscribedSocities subscribedSubSocities',
//                     select: 'name _id'
//                 },
//                 {
//                     path: 'profile.posts',
//                     model: 'Post',
//                     populate: [{
//                         path: 'author',
//                         select: 'name username profile'
//                     },
//                     {
//                         path: 'voteId',
//                     },
//                     {
//                         path: 'society',
//                         select: 'name _id'
//                     }


//                     ],
//                     options: { sort: { createdAt: -1 } }
//                 }])
//         // console.log("user>", userExists)
//         if (!userExists) return res.status(404).json({ message: "User Not Found", error: "User Not Found" })

//         // console.log("use>>>", userExists.profile.posts)


//         const user = {
//             _id: userExists._id,
//             name: userExists.name,
//             email:
//                 userExists?.universityEmail ||
//                 userExists?.personalEmail ||
//                 userExists?.secondaryPersonalEmail,
//             username: userExists.username,
//             profile: userExists.profile,
//             university: (userExists.role !== 'ext_org') ? userExists.university : undefined,
//             super_role: userExists.super_role,
//             role: userExists.role,
//             joined: moment(userExists.createdAt).format('MMMM DD, YYYY'),
//             joinedSocieties: userExists.subscribedSocities,
//             // joinedSubSocieties: userExists.subscribedSubSocities,
//             verified: userExists.universityEmailVerified,
//             // posts: userExists.posts,
//             // references: {
//             //   university: {
//             //     name: userExists.university.universityId.name,
//             //     _id: userExists.university.universityId._id,
//             //   },
//             //   campus: {
//             //     name: userExists.university.campusId.name,
//             //     _id: userExists.university.campusId._id,
//             //   },
//             // },
//         };


//         // console.log("use>>", user)
//         return res.status(200).json(user)
//     } catch (error) {
//         console.error("Error", error)
//         res.status(500).json("Internal Server Error")
//     }
// })

router.get('/profile', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        // Fetch user data from the database
        const userExists = await User.findById({ _id: req.query.id })
            .select("-password")
            .populate([
                {
                    path: 'subscribedSocities subscribedSubSocities',
                    select: 'name _id'
                },
                {
                    path: 'profile.posts',
                    model: 'Post',
                    populate: [
                        {
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
                },
                {
                    path: 'profile.connections.friend',
                    select: 'name _id profile.picture status',
                }
            ]);

        if (!userExists || userExists.profile.connections.blocked.includes(userId)) return res.status(404).json({ message: "User Not Found", error: "User Not Found" });



        // Construct the user profile response
        const user = {
            _id: userExists._id,
            name: userExists.name,
            email: userExists?.universityEmail ||
                userExists?.personalEmail ||
                userExists?.secondaryPersonalEmail,
            username: userExists.username,
            profile: userExists.profile,
            university: (userExists.role !== 'ext_org') ? userExists.university : undefined,
            super_role: userExists.super_role,
            role: userExists.role,
            joined: moment(userExists.createdAt).format('MMMM DD, YYYY'),
            joinedSocieties: userExists.subscribedSocities,
            verified: userExists.universityEmailVerified,
            connections: userExists.profile.connections.friend, // Adding friend connections
        };

        // Return the user profile
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error", error);
        res.status(500).json("Internal Server Error");
    }
});



router.get('/subscribedSocieties', async (req, res) => {
    try {
        // console.log("here", req.query.id, req.params.id)

        // 67629d6fe10288ec95375ee0
        const userExists = await User.findById({ _id: req.query.id }).select("-password")
            .populate({
                path: 'subscribedSocities subscribedSubSocities',
                select: 'name _id'

            })
        // console.log("user>", userExists)
        if (!userExists) return res.status(404).json({ message: "User Not Found", error: "User Not Found" })

        // console.log("use>>>", userExists)


        const user = {

            joinedSocieties: userExists.subscribedSocities,
            joinedSubSocieties: userExists.subscribedSubSocities,

        };


        // console.log("use>>", user)
        return res.status(200).json(user)
    } catch (error) {
        console.error("Error", error)
        res.status(500).json("Internal Server Error")
    }
})


//USE THIS FOR OWN PROFILE SETTINGS PAGE
router.get('/connections', async (req, res) => {
    try {
        const userId = req.query.id;

        // Fetch the user by ID and only retrieve the connections field
        const userExists = await User.findById({ _id: userId })
            .select('profile.connections.friend -_id -password'); // Exclude unnecessary fields

        if (!userExists) {
            return res.status(404).json({ message: "User Not Found", error: "User Not Found" });
        }

        // Extract friend user connections from the array
        const friendsArray = userExists.profile?.connections?.friend || [];

        if (friendsArray.length === 0) {
            return res.status(200).json({ connections: [], message: "No Connections" }); // No connections
        }

        // Create an array of friend user IDs
        const friendUserIds = friendsArray.map(conn => conn.user.toString());

        // Fetch details of friends using their IDs
        const friendsDetails = await User.find({ _id: { $in: friendUserIds } })
            .select('name _id profile.picture');

        // Filter out blocked users by checking the current user's blocked list
        const blockedUsers = userExists.profile?.connections?.blocked || [];

        const filteredConnections = friendsDetails.filter(friend => {
            // Check if the friend is blocked by the current user
            return !blockedUsers.includes(friend._id.toString());
        });

        // Map statuses and other details back to the filtered friends
        const connections = filteredConnections.map(friend => {
            // Find the connection status in the original array
            const connection = friendsArray.find(conn => conn.user.toString() === friend._id.toString());
            return {
                _id: friend._id,
                name: friend.name,
                picture: friend.profile?.picture,
                status: connection ? connection.status : 'unknown', // Default to 'unknown' if no status
            };
        });

        return res.status(200).json({ connections });
    } catch (error) {
        console.error("Error in /connections route:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.get('/connection/stream', async (req, res) => {
    try {

        const { userId } = getUserDetails(req)

        const user = await User.findById({ _id: userId })
            .select('profile.connections.friend').populate('profile.connections.friend.user');

        if (!user || !user.profile?.connections?.friend) {
            return res.status(404).json({ message: "No connections yet", connections: [] });
        }
        const connections = user.profile.connections.friend.map(friend => {
            // console.log(
            //     // friend,
            //     friend.user.name,
            //     friend.user.profile.picture,
            //     friend.status,

            //     friend.requestedBy,
            //     friend.requestedBy.toHexString()
            // )
            return {
                status: friend.status === 'requested' ? (friend.requestedBy.toHexString() === userId ? 'outgoing' : 'incoming') : 'friends',
                name: friend.user.name,
                picture: friend.user.profile.picture,
            }
        })


        return res.status(200).json({ connections });

    } catch (error) {
        console.error("Error in /connection/stream in user.route.js", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})




router.post('/cancel-friend-request', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const { userId } = getUserDetails(req);

        const currentUser = await User.findById(userId);
        const toFriendUserExists = await User.findById(toFriendUser);

        if (!currentUser || !toFriendUserExists) {
            return res.status(404).json({ message: "User Not Found" });
        }

        // Remove the friend request if it exists
        currentUser.profile.connections.friend = currentUser.profile.connections.friend.filter(
            conn => conn.user.toString() !== toFriendUser
        );
        await currentUser.save();

        toFriendUserExists.profile.connections.friend = toFriendUserExists.profile.connections.friend.filter(
            conn => conn.user.toString() !== userId
        );
        await toFriendUserExists.save();

        return res.status(200).json({ message: "Friend request canceled" });

    } catch (error) {
        console.error("Error in cancel-friend-request route:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


router.post('/add-friend', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const { userId } = getUserDetails(req);

        // Find the user to send the friend request to
        const toFriendUserExists = await User.findById(toFriendUser);
        if (!toFriendUserExists) {
            return res.status(404).json({ message: "User Not Found" });
        }

        // Find the current user
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User Not Found" });
        }

        // Ensure neither user is blocked
        if (currentUser.profile.connections.blocked.includes(toFriendUser)) {
            return res.status(400).json({ message: "You have blocked this user." });
        }
        if (toFriendUserExists.profile.connections.blocked.includes(userId)) {
            return res.status(400).json({ message: "This user has house full." });
        }

        // Check if a friend request already exists
        const friendRequestExists = currentUser.profile.connections.friend.some(conn =>
            conn.user.toString() === toFriendUser && conn.status === 'requested');

        if (friendRequestExists) {
            return res.status(400).json({ message: "Friend request already sent" });
        }

        // Create a new friend request
        currentUser.profile.connections.friend.push({
            user: toFriendUser,
            status: 'requested',
            requestedBy: userId,
        });
        await currentUser.save();

        toFriendUserExists.profile.connections.friend.push({
            user: userId,
            status: 'requested',
            requestedBy: userId,
        });
        await toFriendUserExists.save();

        return res.status(200).json({ message: "Friend request sent" });

    } catch (error) {
        console.error("Error in add-friend route:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});





router.get('/societies-top', async (req, res) => {
    try {
        const { campusOrigin } = getUserDetails(req)
        const societies = await Society.find(
            {
                'references.campusOrigin': campusOrigin
            }
        )
            .populate({
                path: 'postsCollectionRef',
                populate: {
                    path: 'posts.postId',
                    select: 'createdAt',
                },
            })
            .sort({ 'postsCollectionRef.posts.createdAt': -1 }) // Sorting by most recent posts
            .limit(4)
            .select('name postsCollectionRef'); // Selecting only necessary fields

        // console.log("scoeies", societies, campusOrigin)

        if (!societies || societies.length === 0) {
            return res.status(404).json({ message: "No societies found", error: "Societies Not Found" });
        }

        // Format the response
        const formattedSocieties = societies.map(society => ({
            _id: society._id,
            name: society.name,
            postsToday: (society.postsCollectionRef?.posts || [])
                .filter(post => new Date(post.createdAt).toDateString() === new Date().toDateString())
                .length, // Count posts created today
        }));

        return res.status(200).json(formattedSocieties);
    } catch (error) {
        console.error("Error fetching societies-top:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



router.get('/teacher/attachUser', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        const user = await User.findById(userId)
        const response = await user.setTeacherModal(req)
        console.log("DOG", response)
        res.status(response.status).json({
            message: response.message,
            teacher: response.teacher || null,
            attached: response.attached || false,
            teachers: response.teachers || null,
            error: response.error || null,
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" })
        console.error("Error in /teacher/attachUser in user.route.js", error.message)
    }
})


router.get('/teacher/joinModel', async (req, res) => {
    try {
        const { teacherId } = req.query;
        console.log("E", teacherId)
        if (!teacherId) return res.status(404).json({ error: "Teacher Id not Sent" })
        const { userId } = getUserDetails(req);

        const user = await User.findById(userId)
        const response = await user.setJoinATeacherModal(teacherId, req)

        console.log(response)

        res.status(response.status).json({
            message: response.message || null,
            error: response.error || null,
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" })
        console.error("Error in /teacher/joinModel in user.route.js", error.message)

    }
})




module.exports = router