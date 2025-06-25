const express = require('express');
const User = require('../../models/user/user.model');
const router = express.Router();
const moment = require('moment');
const { getUserDetails, sendOtp, handlePlatformResponse } = require('../../utils/utils');
const { default: mongoose } = require('mongoose');
const Society = require('../../models/society/society.model');
const FriendRequest = require('../../models/user/friend.request.model');
const Teacher = require('../../models/university/teacher/teacher.model');
const UserRoles = require('../../models/userRoles');
const { upload, uploadImage } = require('../../utils/multer.utils');
const { uploadPictureMedia } = require('../../utils/aws.bucket.utils');
const { OTP } = require('../../models/otp/otp');
const { resendEmailConfirmation } = require('../../utils/email.util');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Department = require('../../models/university/department/department.university.model');
const ModRequest = require('../../models/mod/mod.request.model');

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.query.id;
        const user = await User.findById(userId)
            .select('name username email profile university joined subscribedSocities connections')
            .populate('university.universityId', 'name');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ profile: user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

router.get('/profile', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
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
            ]);

        if (!userExists || userExists.profile.connections.blocked.includes(userId)) return res.status(404).json({ message: "User Not Found", error: "User Not Found" });

        let friendStatus = null;
        let friendConnection = await FriendRequest.findOne({
            user: userExists._id,
            requestedBy: userId
        });
        if (!friendConnection) {
            friendConnection = await FriendRequest.findOne({
                user: userId,
                requestedBy: userExists._id
            });
        }
        friendStatus = friendConnection?.status || null;

        if (friendConnection) {
            if (friendConnection.status === 'requested' && friendConnection.requestedBy.toString() === userId) {
                friendStatus = 'canCancel';
            } else if (friendConnection.status === 'requested') {
                friendStatus = 'accept/reject';
            } else if (friendConnection.status === 'accepted') {
                friendStatus = 'friends';
            }
        } else {
            friendStatus = 'connect';
        }

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
            connections: userExists.profile.connections.friends,
            friendStatus
        };

        return res.status(200).json(user);
    } catch (error) {
        console.error("Error", error);
        res.status(500).json("Internal Server Error");
    }
});

router.get('/subscribedSocieties', async (req, res) => {
    try {
        const userExists = await User.findById({ _id: req.query.id }).select("-password")
            .populate({
                path: 'subscribedSocities subscribedSubSocities',
                select: 'name _id'
            });
        if (!userExists) return res.status(404).json({ message: "User Not Found", error: "User Not Found" });

        const user = {
            joinedSocieties: userExists.subscribedSocities,
            joinedSubSocieties: userExists.subscribedSubSocities,
        };

        return res.status(200).json(user);
    } catch (error) {
        console.error("Error", error);
        res.status(500).json("Internal Server Error");
    }
});


router.get('/connections', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);

        const user = await User.findById(userId)
            .select('profile.connections.friends')
            .populate({
                path: 'profile.connections.friends',
                match: { status: 'accepted' },
                populate: [
                    { path: 'user', select: '_id name username profile.picture' },
                    { path: 'requestedBy', select: '_id name username profile.picture' },
                ],
            })
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const allFriendRefs = user?.profile?.connections?.friends || [];

        const validFriends = [];
        const invalidFriendIds = [];

        for (const friendRequest of allFriendRefs) {
            const isValid =
                friendRequest?.status === 'accepted' &&
                friendRequest?.user?._id &&
                friendRequest?.requestedBy?._id;

            if (isValid) {
                const otherUser =
                    friendRequest.user._id.toString() === userId
                        ? friendRequest.requestedBy
                        : friendRequest.user;

                validFriends.push({
                    _id: otherUser._id,
                    name: otherUser.name,
                    username: otherUser.username,
                    picture: otherUser?.profile?.picture || null,
                });
            } else if (friendRequest?._id) {
                invalidFriendIds.push(friendRequest._id);
            }
        }

        // 🔥 Cleanup: remove broken friendRequest references from user
        // if (invalidFriendIds.length > 0) {
        //     await User.findByIdAndUpdate(userId, {
        //         $pull: {
        //             'profile.connections.friends': { $in: invalidFriendIds },
        //         },
        //     });
        // }

        res.status(200).json({ connections: validFriends });
    } catch (error) {
        console.error('Error in /connections route:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// router.get('/connections', async (req, res) => {
//     try {
//         const { userId } = getUserDetails(req);
//         const user = await User.findById(userId)
//             .select('profile.connections.friends')
//             .populate({
//                 path: 'profile.connections.friends',
//                 match: { status: 'accepted' },
//                 populate: [
//                     { path: 'user', select: '_id name username profile.picture' },
//                     { path: 'requestedBy', select: '_id name username profile.picture' },
//                 ],
//             })
//             .lean();

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         const connections = user?.profile?.connections?.friends
//             .filter((friendRequest) => friendRequest?.status === 'accepted')
//             .map((friendRequest) => {
//                 const otherUser =
//                     friendRequest?.user?._id?.toString() === userId
//                         ? friendRequest?.requestedBy
//                         : friendRequest?.user;
//                 return {
//                     _id: otherUser?._id,
//                     name: otherUser?.name,
//                     username: otherUser?.username,
//                     picture: otherUser?.profile?.picture,
//                 };
//             });

//         res.status(200).json({ connections });
//     } catch (error) {
//         console.error('Error in /connections route:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

router.get('/connection/stream', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        const user = await User.findById({ _id: userId }).populate({
            path: "profile.connections.friends",
            populate: {
                path: "user requestedBy",
                model: "User",
            },
        });

        if (!user || !user.profile?.connections?.friends) {
            return res.status(404).json({ message: "No connections yet", connections: [] });
        }
        const connections = user.profile.connections.friends.map(friend => {
            const friendUser = friend.user._id.toString() === userId ? friend.requestedBy : friend.user;
            return {
                status: friend.status === 'requested' ? (friend.requestedBy.toHexString() === userId ? 'outgoing' : 'incoming') : 'friends',
                name: friendUser.name,
                picture: friendUser.profile.picture,
            };
        });

        return res.status(200).json({ connections });
    } catch (error) {
        console.error("Error in /connection/stream in user.route.js", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Friend action routes
router.post('/add-friend', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const { userId } = getUserDetails(req);
        console.log('add-friend: userId=', userId, 'toFriendUser=', toFriendUser);

        if (!toFriendUser) {
            console.error('add-friend: Missing toFriendUser');
            return res.status(400).json({ message: 'Recipient user ID is required' });
        }

        const toFriendUserExists = await User.findById(toFriendUser);
        if (!toFriendUserExists) {
            console.error('add-friend: Recipient not found', toFriendUser);
            return res.status(404).json({ message: 'Recipient user not found' });
        }

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            console.error('add-friend: Current user not found', userId);
            return res.status(404).json({ message: 'Current user not found' });
        }

        if (currentUser.profile.connections.blocked.includes(toFriendUser)) {
            console.log('add-friend: Current user blocked recipient');
            return res.status(400).json({ message: 'You have blocked this user' });
        }
        if (toFriendUserExists.profile.connections.blocked.includes(userId)) {
            console.log('add-friend: Recipient blocked current user');
            return res.status(400).json({ message: 'This user has blocked you' });
        }

        const friendRequestExists = await FriendRequest.findOne({
            user: toFriendUser,
            requestedBy: userId,
            status: 'requested',
        });
        if (friendRequestExists) {
            console.log('add-friend: Friend request already exists', friendRequestExists._id);
            return res.status(400).json({ message: 'Friend request already sent' });
        }

        const createNewRequest = await FriendRequest.create({
            user: toFriendUser,
            status: 'requested',
            requestedBy: userId,
        });
        console.log('add-friend: Created friend request', createNewRequest._id);

        return res.status(200).json({
            requested: true,
            message: 'Friend request sent',
            requestId: createNewRequest._id,
        });
    } catch (error) {
        console.error('add-friend: Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/reject-friend-request', async (req, res) => {
    try {
        const { toRejectUser } = req.body;
        const { userId } = getUserDetails(req);
        console.log('reject-friend-request: userId=', userId, 'toRejectUser=', toRejectUser);

        const currentUser = await User.findById(userId);
        const toRejectFriendship = await User.findById(toRejectUser);
        if (!currentUser || !toRejectFriendship) {
            console.error('reject-friend-request: User not found');
            return res.status(404).json({ message: 'User Not Found' });
        }

        const friendRequestExists = await FriendRequest.findOneAndDelete({
            user: userId,
            status: 'requested',
            requestedBy: toRejectUser,
        });
        if (!friendRequestExists) {
            console.log('reject-friend-request: Friend request does not exist');
            return res.status(400).json({ message: 'Friend request does not exist' });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });
        await User.findByIdAndUpdate(toRejectUser, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });

        console.log('reject-friend-request: Friend request deleted', friendRequestExists._id);
        return res.status(200).json({ message: 'Friend request rejected' });
    } catch (error) {
        console.error('reject-friend-request: Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/accept-friend-request', async (req, res) => {
    try {
        const { toAcceptFriendUser } = req.body;
        const { userId } = getUserDetails(req);
        console.log('accept-friend-request: userId=', userId, 'toAcceptFriendUser=', toAcceptFriendUser);

        const currentUser = await User.findById(userId);
        const toAcceptFriendship = await User.findById(toAcceptFriendUser);
        if (!currentUser || !toAcceptFriendship) {
            console.error('accept-friend-request: User not found');
            return res.status(404).json({ message: 'User Not Found' });
        }

        const friendRequestExists = await FriendRequest.findOneAndUpdate(
            {
                user: userId,
                status: 'requested',
                requestedBy: toAcceptFriendUser,
            },
            { status: 'accepted' },
            { new: true }
        );
        if (!friendRequestExists) {
            console.log('accept-friend-request: Friend request does not exist');
            return res.status(400).json({ message: 'Friend request does not exist' });
        }

        // Add FriendRequest ID to both users' profile.connections.friends
         await User.updateOne(
            { _id: userId },
            { $addToSet: { 'profile.connections.friends': friendRequestExists._id } }
        );
        await User.updateOne(
            { _id: toAcceptFriendUser },
            { $addToSet: { 'profile.connections.friends': friendRequestExists._id } }
        );
        await User.updateOne(
            { _id: toAcceptFriendUser },
            { $addToSet: { 'profile.connections.friends': friendRequestExists._id } }
        );

        console.log('accept-friend-request: Friend request accepted', friendRequestExists._id);
        return res.status(200).json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error('accept-friend-request: Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/friend-requests', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        console.log('friend-requests: Fetching for userId=', userId);

        const requests = await FriendRequest.find({
            user: userId,
            status: 'requested',
        })
            .populate('requestedBy', 'name username profile.picture')
            .sort({ createdAt: -1 });

        console.log('friend-requests: Found', requests.length, 'requests', JSON.stringify(requests, null, 2));

        const formattedRequests = requests.map((req) => ({
            _id: req._id,
            fromUser: {
                _id: req.requestedBy._id,
                name: req.requestedBy.name,
                username: req.requestedBy.username,
                profilePicture: req.requestedBy.profile.picture,
            },
            createdAt: req.createdAt,
        }));

        res.status(200).json({ requests: formattedRequests });
    } catch (error) {
        console.error('friend-requests: Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/cancel-friend-request', async (req, res) => {
    try {
        const { toFriendUser } = req.body;
        const { userId } = getUserDetails(req);
        console.log('cancel-friend-request: userId=', userId, 'toFriendUser=', toFriendUser);

        const currentUser = await User.findById(userId);
        const toFriendUserExists = await User.findById(toFriendUser);
        if (!currentUser || !toFriendUserExists) {
            console.error('cancel-friend-request: User not found');
            return res.status(404).json({ message: 'User Not Found' });
        }

        const friendRequestExists = await FriendRequest.findOneAndDelete({
            user: toFriendUser,
            status: 'requested',
            requestedBy: userId,
        });
        if (!friendRequestExists) {
            console.log('cancel-friend-request: Friend request does not exist');
            return res.status(400).json({ message: 'Friend request does not exist' });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });
        await User.findByIdAndUpdate(toFriendUser, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });

        console.log('cancel-friend-request: Friend request deleted', friendRequestExists._id);
        return res.status(200).json({ message: 'Friend request canceled' });
    } catch (error) {
        console.error('cancel-friend-request: Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/unfriend-request', async (req, res) => {
    try {
        const { toUn_FriendUser } = req.body;
        const { userId } = getUserDetails(req);
        console.log('unfriend-request: userId=', userId, 'toUn_FriendUser=', toUn_FriendUser);

        const currentUser = await User.findById(userId);
        const toUn_FriendUserExists = await User.findById(toUn_FriendUser);
        if (!currentUser || !toUn_FriendUserExists) {
            console.error('unfriend-request: User not found');
            return res.status(404).json({ message: 'User Not Found' });
        }

        let friendRequestExists = await FriendRequest.findOneAndDelete({
            user: toUn_FriendUser,
            requestedBy: userId,
            status: 'accepted',
        });
        if (!friendRequestExists) {
            friendRequestExists = await FriendRequest.findOneAndDelete({
                user: userId,
                requestedBy: toUn_FriendUser,
                status: 'accepted',
            });
        }

        if (!friendRequestExists) {
            console.log('unfriend-request: Friend request does not exist');
            return res.status(400).json({ message: 'Friend request does not exist' });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });
        await User.findByIdAndUpdate(toUn_FriendUser, {
            $pull: { 'profile.connections.friends': friendRequestExists._id },
        });

        console.log('unfriend-request: Friend request deleted', friendRequestExists._id);
        return res.status(200).json({ message: 'Friend connection ended' });
    } catch (error) {
        console.error('unfriend-request: Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/societies-top', async (req, res) => {
    try {
        const { campusOrigin } = getUserDetails(req);
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
            .sort({ 'postsCollectionRef.posts.createdAt': -1 })
            .limit(4)
            .select('name postsCollectionRef');

        if (!societies || societies.length === 0) {
            return res.status(404).json({ message: "No societies found", error: "Societies Not Found" });
        }

        const formattedSocieties = societies.map(society => ({
            _id: society._id,
            name: society.name,
            postsToday: (society.postsCollectionRef?.posts || [])
                .filter(post => new Date(post.createdAt).toDateString() === new Date().toDateString())
                .length,
        }));

        return res.status(200).json(formattedSocieties);
    } catch (error) {
        console.error("Error fetching societies-top:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get('/teacher/attachUser', async (req, res) => {
    try {
        const { userId, platform } = getUserDetails(req);
        console.log("CHecking platform ", platform);
        const user = await User.findById(userId);
        const response = await setTeacherModal(req, user, platform);
        console.log("DOG", response);
        if(response?.forwarded){
            await user.populate([
                    { path: "university.universityId", select: "-users _id" },
                    { path: "university.campusId", select: "-users _id" },
                    { path: "university.departmentId", select: "name _id" },
                 ]);
              return  handlePlatformResponse(user,res,req)


        }
        res.status(response.status).json({
            message: response.message,
            teacher: response.teacher || null,
            attached: response.attached || false,
            teachers: response.teachers || null,
            teacherConnectivities: response?.teacherConnectivities || null,
            error: response.error || null,
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        console.error("Error in /teacher/attachUser in user.route.js", error.message);
    }
});

const setTeacherModal = async function (req, user, platform) {
    console.log("Platform->", platform);
    console.log("THE USER ,", user)
    try {
        if (user.role === UserRoles.teacher) {
            const teacherModalExists = await Teacher.findOne({ email: user.universityEmail });
            if (!teacherModalExists) {
                const campusOrigin = user.university.campusId;
                const universityOrigin = user.university.universityId;
                const similarTeacherModals = await Teacher.findSimilarTeachers(campusOrigin, universityOrigin);
                if (!similarTeacherModals || similarTeacherModals.length === 0) {
                    return { message: 'No similar teachers to show yet', status: 204 };
                }
                return {
                    status: 200,
                    teachers: similarTeacherModals.map((teacher) => ({
                        _id: teacher._id,
                        name: teacher.name,
                        email: teacher.email,
                        userAttachedBool: teacher.userAttachedBool,
                        imageUrl: teacher.imageUrl,
                        onLeave: teacher.onLeave,
                        hasLeft: teacher.hasLeft,
                        rating: teacher.rating,
                        userAttachedBool: teacher.userAttachedBool,
                        department: teacher.department.departmentId.name
                    })),
                    attached: false
                };
            } else {
                if (!teacherModalExists.userAttached && !teacherModalExists.userAttachedBool) {
                    teacherModalExists.userAttached = user._id;
                    teacherModalExists.userAttachedBool = true;
                    teacherModalExists.userAttachedBy.userType = UserRoles.teacher;
                    teacherModalExists.userAttachedBy.by = user._id;
                    await teacherModalExists.save();
                    if (!user.teacherConnectivities) {
    user.teacherConnectivities = {};
}
                    user.teacherConnectivities.teacherModal = teacherModalExists._id;
                    user.teacherConnectivities.attached = true;
                    await user.save();
                    if(platform === 'web'){
                        req.session.user.teacherConnectivities = {
                        attached: user?.teacherConnectivities?.attached,
                        teacherModal: user?.teacherConnectivities?.teacherModal
                    };
                    }
                    const teacherConnectivities = {
                        attached: user.teacherConnectivities.attached,
                        teacherModal: user.teacherConnectivities.teacherModal
                    };
                    const resolvedData = { status: 201, message: 'User with role teacher attached with Modal successfully' };
                    if (platform === "app") { resolvedData.teacherConnectivities = teacherConnectivities; }
                    else{
                    return new Promise((resolve, reject) => {
                        req.session.save((err) => {
                            if (err) {
                                console.error("Session save error:", err);
                                reject({ status: 500, message: "Internal Server Error" });
                            } else {
                                resolve(resolvedData);
                            }
                        });
                    });
                }
                 return { status: 201, message: "Forwarded", forwarded: true}
                } else {
                    // console.log("teacherModalExists",teacherModalExists.userAttached)
                    // console.log(" user._id ", user._id )
                    // console.log("teacherModalExists._id ",teacherModalExists._id )
                    // console.log("user.teacherConnectivities.teacherModal",user.teacherConnectivities.teacherModal)

                    // console.log("teacherModalExists.userAttached === user._id ",teacherModalExists.userAttached === user._id )
                    // console.log("teacherModalExists._id === user.teacherConnectivities.teacherModal",teacherModalExists._id === user.teacherConnectivities.teacherModal)
                   
                   
                    //  console.log("teacherModalExists.userAttached.equals(user._id)",teacherModalExists.userAttached.equals(user._id) )
                    // console.log("teacherModalExists._id.equals(user.teacherConnectivities.teacherModal)",teacherModalExists._id.equals(user.teacherConnectivities.teacherModal))
                   

                    if(teacherModalExists.userAttached.equals(user._id) && teacherModalExists._id.equals(user.teacherConnectivities.teacherModal )){
                        return { status: 201, message: "Forwarded", forwarded: true}
                    }
                    return { status: 200, message: 'User already attached with another modal, Please verify before Modifyng', attached: false };
                }
            }
        }
    } catch (error) {
        console.error("Error in setTeacherModal method in user.model.js", error);
        return { status: 500, message: "Internal Server Error", error: error.message };
    }
};

router.get('/teacher/joinModel', async (req, res) => {
    try {
        const { teacherId } = req.query;
        console.log("E", teacherId);
        if (!teacherId) return res.status(404).json({ error: "Teacher Id not Sent" });
        const { userId } = getUserDetails(req);
        const user = await User.findById(userId);
        const response = await user.setJoinATeacherModal(teacherId, req);
        console.log(response);
        res.status(response.status).json({
            message: response.message || null,
            error: response.error || null,
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
        console.error("Error in /teacher/joinModel in user.route.js", error.message);
    }
});

router.get("/me", async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        const user = await User.findById(userId).select('_id');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ _id: user._id });
    } catch (error) {
        console.error("Error in /user/me", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put('/update/picture', uploadImage.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const { userId } = getUserDetails(req);
        const { url, type } = await uploadPictureMedia(req.file, req);
        if (!url) {
            return res.status(500).json({ error: "Failed to upload image" });
        }
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: { 'profile.picture': url },
                $push: {
                    'profile.pictureList': {
                        image: url,
                        timestamp: new Date()
                    }
                }
            },
            { new: true, projection: { 'profile.picture': 1 } }
        );
        if (!user) {
            return res.status(404).json({ error: "User Not Found" });
        }
        if (req?.session?.user) {
            req.session?.user?.profile?.picture.push(newImageUrl);
            req.session?.save();
        }
        return res.status(200).json({
            message: "Profile Picture Added",
            picture: user.profile.picture
        });
    } catch (error) {
        console.error("Error in /update/picture:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put('/update/name', async (req, res) => {
    try {
        const { name } = req.body;
        const { userId } = getUserDetails(req);
        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { name } },
            { new: true, projection: { name: 1 } }
        );
        if (!user) {
            return res.status(404).json({ error: "User Not Found" });
        }
        return res.status(200).json({
            message: "Name Updated",
            name: user.name
        });
    } catch (error) {
        console.error("Error in /update/name:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put('/update/personalEmail', async (req, res) => {
    try {
        const { personalEmail } = req.body;
        const { userId, name, role } = getUserDetails(req);
        if (role !== UserRoles.student) {
            return res.status(403).json({ error: "Only students can update secondary personal email" });
        }
        const isUserAttached = await User.findOne({
            _id: userId, $or:
                [{ personalEmail },
                { universityEmail: personalEmail },
                { secondaryPersonalEmail: personalEmail }]
        });
        if (isUserAttached) {
            return res.status(400).json({ error: "Email already attached to this account" });
        }
        const isUserAttachedToOtherPeopleAccount = await User.findOne({
            $or:
                [{ personalEmail },
                { secondaryPersonalEmail: personalEmail }]
        });
        if (isUserAttachedToOtherPeopleAccount) {
            return res.status(400).json({ error: "Email already attached to someother account" });
        }
        if (!personalEmail) {
            return res.status(400).json({ error: "Personal Email is required" });
        }
        deliverOTP({ _id: userId, name: name }, personalEmail, resendEmailConfirmation, req, res);
        return res.status(200).json({
            message: "Email Sent",
            requireUniversityOtp: false
        });
    } catch (error) {
        console.error("Error in /update/personalEmail:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/verify/personalEmail/otp", async (req, res) => {
    const { email, phoneNumber, otp, purpose } = req.body;
    const { userId, role } = getUserDetails(req);
    const personalEmail = email;
    if ((!email && !phoneNumber) || !otp) {
        return res
            .status(400)
            .json({ message: "Email or phoneNumber and OTP are required." });
    }
    try {
        const query = email ? { email, purpose, used: false } : { phoneNumber, used: false };
        const otpEntry = await OTP.findOne(query);
        if (!otpEntry) {
            return res
                .status(404)
                .json({ message: "No OTP found for the provided details." });
        }
        if (otpEntry.used === true) {
            await OTP.findByIdAndDelete({ _id: otpEntry._id });
            return res.status(404)
                .json({ message: "OTP used already." });
        }
        const isOTPMatched = await bcryptjs.compare(
            otp,
            otpEntry.otp || ""
        );
        if (!isOTPMatched) {
            return res.status(401).json({ message: "Invalid OTP." });
        }
        if (moment().isAfter(moment(otpEntry.otpExpiration))) {
            return res.status(401).json({ message: "OTP has expired." });
        }
        console.log("Id", otpEntry.ref);
        otpEntry.used = true;
        await otpEntry.save();
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { personalEmail, personalEmailVerified: true } },
            { new: true, projection: { personalEmail: 1 } }
        );
        if (!user) {
            return res.status(404).json({ error: "User Not Found" });
        }
        return res.status(200).json({
            message: "Personal Email Verified",
            personalEmail: user.personalEmail
        });
    } catch (error) {
        console.error("Error in verify-otp:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.put('/update/secondaryPersonalEmail', async (req, res) => {
    try {
        const { secondaryPersonalEmail } = req.body;
        const { userId, name, role } = getUserDetails(req);
        console.log("DATA", userId, name, role);
        const isUserAttached = await User.findOne({
            _id: userId, $or:
                [{ secondaryPersonalEmail },
                { universityEmail: secondaryPersonalEmail },
                { personalEmail: secondaryPersonalEmail }]
        });
        if (isUserAttached) {
            return res.status(400).json({ error: "Email already attached to this account" });
        }
        const isUserAttachedToOtherPeopleAccount = await User.findOne({
            $or:
                [{ secondaryPersonalEmail },
                { personalEmail: secondaryPersonalEmail }]
        });
        if (isUserAttachedToOtherPeopleAccount) {
            return res.status(400).json({ error: "Email already attached to someother account" });
        }
        if (!secondaryPersonalEmail) {
            return res.status(400).json({ error: "Personal Email is required" });
        }
        deliverOTP({ _id: userId, name: name }, secondaryPersonalEmail, resendEmailConfirmation, req, res);
        return res.status(200).json({
            message: "Email Sent",
            requireUniversityOtp: false
        });
    } catch (error) {
        console.error("Error in /update/secondaryPersonalEmail:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/verify/secondaryPersonalEmail/otp", async (req, res) => {
    const { email, phoneNumber, otp, purpose } = req.body;
    const { userId } = getUserDetails(req);
    const secondaryPersonalEmail = email;
    console.log("DATA", userId, email, phoneNumber, otp, purpose);
    if ((!email && !phoneNumber) || !otp) {
        return res
            .status(400)
            .json({ message: "Email or phoneNumber and OTP are required." });
    }
    try {
        const query = email ? { email, purpose, used: false } : { phoneNumber, used: false };
        const otpEntry = await OTP.findOne(query);
        if (!otpEntry) {
            return res
                .status(404)
                .json({ message: "No OTP found for the provided details." });
        }
        if (otpEntry.used === true) {
            await OTP.findByIdAndDelete({ _id: otpEntry._id });
            return res.status(404)
                .json({ message: "OTP used already." });
        }
        const isOTPMatched = await bcryptjs.compare(
            otp,
            otpEntry.otp || ""
        );
        if (!isOTPMatched) {
            return res.status(401).json({ message: "Invalid OTP." });
        }
        if (moment().isAfter(moment(otpEntry.otpExpiration))) {
            return res.status(401).json({ message: "OTP has expired." });
        }
        console.log("Id", otpEntry.ref);
        otpEntry.used = true;
        await otpEntry.save();
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { secondaryPersonalEmail, secondaryPersonalEmailVerified: true } },
            { new: true, projection: { secondaryPersonalEmail: 1 } }
        );
        if (!user) {
            return res.status(404).json({ error: "User Not Found" });
        }
        return res.status(200).json({
            message: "Personal Email Verified",
            secondaryPersonalEmail: user.secondaryPersonalEmail
        });
    } catch (error) {
        console.error("Error in verify-otp:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

const deliverOTP = async (user, email, emailFunction, req, res) => {
    console.log("Deliver OTP", user, email);
    const { otp, otpResponse } = await sendOtp(
        null,
        email = email,
        user._id,
        user.name,
        purpose = 'emailVerification',
    );
    if (!otpResponse) {
        return res.status(500).json({ message: "Failed to generate OTP" });
    }
    const datas = {
        name: user.name,
        email: email,
        otp,
    };
    emailFunction(datas, req, res);
};

router.put('/department/change-once', async (req, res) => {
    try {
        const { departmentId } = req.body;
        const { userId } = getUserDetails(req);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const departmentExists = await Department.findById(departmentId);
        if (!departmentExists) {
            return res.status(404).json({ error: "No such DepartmentId exists" });
        }
        if (user.changedDepartmentOnce) {
            return res.status(200).json({
                message: "You already availed One Time Department Change",
            });
        }
        user.changedDepartmentOnce = true;
        user.university.departmentId = departmentId;
        await user.save();
        await user.populate([
            { path: "university.universityId", select: "name _id" },
            { path: "university.campusId", select: "name _id" },
            { path: "university.departmentId", select: "name _id" },
            { path: "subscribedSocities", select: "name _id" },
            { path: "subscribedSubSocities", select: "name _id" },
        ]);
        await handlePlatformResponse(user, res, req);
    } catch (e) {
        console.error("Error in /department/change-once", e);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put('/graduation-year/change', async (req, res) => {
    try {
        const { graduationYearDateTime } = req.body;
        const { userId } = getUserDetails(req);
        console.log("graduationYearDateTime", graduationYearDateTime);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (user.changedGraduationYearOnce) {
            return res.status(200).json({
                message: "You already availed One Time Department Change",
            });
        }
        user.changedGraduationYearOnce = true;
        user.profile.graduationYear = graduationYearDateTime;
        await user.save();
        await user.populate([
            { path: "university.universityId", select: "name _id" },
            { path: "university.campusId", select: "name _id" },
            { path: "university.departmentId", select: "name _id" },
            { path: "subscribedSocities", select: "name _id" },
            { path: "subscribedSubSocities", select: "name _id" },
        ]);
        await handlePlatformResponse(user, res, req);
    } catch (e) {
        console.error("Error in /department/change-once", e);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.get('/moderated-societies',  async (req, res) => {
  try {
    // Get user ID from auth middleware (adjust based on your setup)
    // const userId = req.sessoin.user._id; // Or req.session.user._id if using sessions
    //USe this, why are you making things complicated
    const {userId} = getUserDetails(req);

    // Find user and populate moderated societies
    const user = await User.findById(userId)
      .populate('profile.moderatorTo.society', '_id name').select('profile.moderatorTo.society');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract societies (handle case where moderatorTo.society is undefined)
    const societies = user.profile.moderatorTo?.society || [];
    console.log(" Societies", societies)

    // Format response
    const formattedSocieties = societies.map(society => ({
      _id: society._id.toString(),
      name: society.name
    }));

    console.log("MODERATED Societies", formattedSocieties)

    res.status(200).json(formattedSocieties);
  } catch (error) {
    console.error('Error fetching moderated societies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


















router.get('/search-campus-users', async (req, res) => {
  try {
    const { query } = req.query;
    const { campusOrigin, userId } = getUserDetails(req);

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const users = await User.find({
      _id: { $ne: userId }, // Exclude the current user
      'university.campusId': campusOrigin, // Match campus
      $or: [
        { name: { $regex: query, $options: 'i' } }, // Case-insensitive name search
        { username: { $regex: query, $options: 'i' } }, // Case-insensitive username search
      ],
    }).select('name username profilePicture _id');

    res.status(200).json({ users });
  } catch (error) {
    console.error('Error in search-campus-users route: ', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post("/mod-request/status", async (req, res) => {
  try {
    const { userId } = getUserDetails(req);

    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    const alreadyRequested = await ModRequest.findOne({ userId });
    if (!alreadyRequested) {
      return res.status(300).json({ message: "Mod request Not submitted" });
    }
    if(alreadyRequested.status = "approved"){
        return handlePlatformResponse(alreadyRequested.userId,res,req)
    }

    res.status(201).json({ message: "Mod request Status", data: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get mod request" });
  }
});

router.post("/mod/request", async (req, res) => {
  try {
    const { reason } = req.body;
        const { userId, universityId, campusId } = getUserDetails(req);


    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    const alreadyRequested = await ModRequest.findOne({ userId });
    if (alreadyRequested) {
      return res.status(400).json({ error: "Mod request already submitted" });
    }

    const newRequest = await ModRequest.create({
      userId,
      universityId,
      campusId,
      reason,
    });

    res.status(201).json({ message: "Mod request submitted", data: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit request" });
  }
});


module.exports = router;