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
                    path: 'profile.connections.friend', // Populating friend connections map
                    select: 'name _id profile.picture status', // Adjust fields to select based on the new map structure
                }
            ]);

        if (!userExists) return res.status(404).json({ message: "User Not Found", error: "User Not Found" });

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



router.get('/connections', async (req, res) => {
    try {
        const userId = req.query.id;

        // Fetch the user by ID and only retrieve the connections field
        const userExists = await User.findById({ _id: userId })
            .select('profile.connections.friend -_id'); // Exclude unnecessary fields

        if (!userExists) {
            return res.status(404).json({ message: "User Not Found", error: "User Not Found" });
        }

        // Extract friend user IDs and statuses from the Map (embedded document)
        const friendsMap = userExists.profile?.connections?.friend || {};



        let friendUserIds = Array.from(friendsMap.keys());


        // console.log("FID", friendsMap, friendUserIds, friendsMap['67634a2cdb5edf37564334ea'])

        if (friendUserIds.length === 0) {
            return res.status(200).json({ connections: [] }); // No connections
        }

        // Fetch details of friends using their IDs
        const friendsDetails = await User.find({ _id: { $in: friendUserIds } })
            .select('name _id profile.picture');

        // Map statuses back to friend details
        const connections = friendsDetails.map((friend, idx) => {
            if (idx >= 5) return;
            return ({
                _id: friend._id,
                name: friend.name,
                picture: friend.profile?.picture,
                status: friendsMap.get(friend._id.toHexString()),
            })
        });

        // console.log("connections", connections)
        return res.status(200).json({ connections });
    } catch (error) {
        console.error("Error in /connections route:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.post('/add-friend', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const toFriendUserExists = await User.findById(toFriendUser).select('profile.connections.friend')
        if (!toFriendUserExists) {
            return res.status(404).json({ message: "User Not Found" });
        }

        const { userId } = getUserDetails(req);
        const currentUser = await User.findById(userId).select('profile.connections.friend');
        if (!currentUser) {
            return res.status(404).json({ message: "User Not Found" });
        }

        // Ensure that profile.connections.friend is a Map
        if (!(currentUser.profile.connections.friend instanceof Map)) {
            currentUser.profile.connections.friend = new Map();
        }

        if (!(toFriendUserExists.profile.connections.friend instanceof Map)) {
            toFriendUserExists.profile.connections.friend = new Map();
        }

        // Check if friend request already exists
        const currentFriendStatus = currentUser.profile.connections.friend.get(toFriendUser);
        const toFriendStatus = toFriendUser.profile?.connections?.friend.get(currentUser);

        if (currentFriendStatus && toFriendStatus) {
            return res.status(400).json({ message: `Friend request already ${currentFriendStatus}`, status: currentFriendStatus });
        }


        // Create a new friend request - store just the status string
        currentUser.profile.connections.friend.set(toFriendUser, 'requested');
        await currentUser.save();

        toFriendUserExists.profile.connections.friend.set(currentUser._id, 'requested');
        await toFriendUserExists.save();

        return res.status(200).json({ connections: currentUser.profile.connections.friend });
    } catch (error) {
        console.error("Error in add-friend route:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post('/cancel-friend-request', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const { userId } = getUserDetails(req);

        const currentUser = await User.findById(userId).select('profile.connections.friend');
        const toFriendUserExists = await User.findById(toFriendUser).select('profile.connections.friend');

        if (!currentUser || !toFriendUserExists) {
            return res.status(404).json({ message: "User Not Found" });
        }

        // Ensure profile.connections.friend is a Map
        if (!(currentUser.profile.connections.friend instanceof Map)) {
            currentUser.profile.connections.friend = new Map();
        }
        if (!(toFriendUserExists.profile.connections.friend instanceof Map)) {
            toFriendUserExists.profile.connections.friend = new Map();
        }

        // Remove the friend request
        currentUser.profile.connections.friend.delete(toFriendUser);
        await currentUser.save();

        toFriendUserExists.profile.connections.friend.delete(userId);
        await toFriendUserExists.save();

        return res.status(200).json({ message: "Friend request canceled" });
    } catch (error) {
        console.error("Error in cancel-friend-request route:", error);
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








module.exports = router