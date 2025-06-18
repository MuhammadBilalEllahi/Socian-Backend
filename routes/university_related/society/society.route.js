const express = require("express");
const SocietyType = require("../../../models/society/society.type.model");
const Society = require("../../../models/society/society.model");
const Members = require("../../../models/society/members.collec.model");
const VerificationRequest = require("../../../models/verification/society.verify.model");
const SubSociety = require("../../../models/society/sub.society.model");
const PostsCollection = require("../../../models/society/post/collection/post.collection.model");
const User = require("../../../models/user/user.model");
const { getUserDetails } = require("../../../utils/utils");
const Post = require("../../../models/society/post/post.model");
const UserRoles = require("../../../models/userRoles");
const router = express.Router();
const redisClient = require('../../../db/reddis')

router.post("/types/create", async (req, res) => {
    try {
        const type = req.body.type;

        const societyTypeIdExists = await SocietyType.findOne({
            societyType: type,
        });
        if (societyTypeIdExists) return res.status(302).json("Type Exists Already");

        const societyType = await SocietyType.create({
            societyType: type,
        });
        await societyType.save();
        if (!societyType) return res.status(302).json("error createing type");
        res.status(200).json({ message: "Type Created", societyType });
    } catch (error) {
        console.error("Error in society routes", error);
        res.status(500).json("Internal Server Error");
    }
});
/**
 * @param {icon,banner} url_link
 */
router.post("/create", async (req, res) => {
    try {

        let companyId;
        // get societyTypes from cache later on
        const { name, description, societyTypeId, category, icon, banner, allows, president } = req.body;
        const { userId, role, universityOrigin, campusOrigin, departmentId } = getUserDetails(req)


        const alreadyExists = await Society.findOne(
            { name: name },
            role === UserRoles.ext_org
                ? { companyReference: { isCompany: true } }
                : {
                    references: {
                        role,
                        universityOrigin,
                        campusOrigin,
                    },
                }
        );
        // console.log("ss", alreadyExists);
        if (alreadyExists) return res.status(302).json("Society already Exists");

        const societyTypeIdExists = await SocietyType.findById(societyTypeId);
        if (!societyTypeIdExists)
            return res.status(302).json("Society Type invalid");
        // console.log("es", societyTypeIdExists);

        const newSociety = new Society({
            name,
            description,
            category,
            icon,
            banner,
            president: president ? president : userId,
            creator: userId,
            moderators: [userId],
            totalMembers: 1,
            societyType: societyTypeIdExists._id,
            ...(role === UserRoles.ext_org
                ? {
                    companyReference: {
                        isCompany: true,
                        // remove user id later
                        companyOrigin: userId,
                    },
                }
                : {
                    references: {
                        role,
                        universityOrigin,
                        campusOrigin,
                    },
                }),
            allows: [allows ? allows : role],
        });

        // console.log("es1", newSociety);

        // await newSociety.save()

        // console.log("es2", newSociety);

        const memberCollection = new Members({
            societyId: newSociety._id,
            members: [userId],
        });
        await memberCollection.save();

        const user = await User.findByIdAndUpdate(
            { _id: userId },
            {
                $addToSet: {
                    'profile.moderatorTo.society': newSociety._id,
                    subscribedSocities: newSociety._id,
                },
            },
            { new: true }
        );

        const postsCollectionRef = new PostsCollection({
            _id: newSociety._id,
            societyId: newSociety._id,
            ...(role === UserRoles.ext_org
                ? {
                    companyReference: {
                        isCompany: true,
                        companyOrigin: companyId,
                    },
                }
                : {
                    references: {
                        role,
                        universityOrigin,
                        campusOrigin
                    },
                }),
        });

        // console.log("es3", postsCollectionRef);

        await postsCollectionRef.save();
        // console.log("es4", postsCollectionRef);

        newSociety.postsCollectionRef = postsCollectionRef._id;
        newSociety.members = memberCollection._id;

        await newSociety.save();

        return res
            .status(201)
            .json({ message: "Society created successfully", society: newSociety });
    } catch (error) {
        console.error("Error creating society: ", error);
        res.status(500).json("Internal Server Error");
    }
});


router.delete('/delete', async (req, res) => {
    try {
        const { societyId } = req.query;

        const nowDeletedSociety = await Society.findByIdAndUpdate(
            societyId,
            { isDeleted: true },
            { new: true }
        );

        if (!nowDeletedSociety) {
            return res.status(400).json({ error: "Couldn't delete society" });
        }

        const users = nowDeletedSociety.moderators;

        // Update all moderators to remove society reference
        await Promise.all(users.map((usr) =>
            User.findByIdAndUpdate(usr._id, {
                $pull: {
                    'profile.moderatorTo.society': nowDeletedSociety._id,
                    subscribedSocities: nowDeletedSociety._id
                }
            })
        ));

        return res.status(200).json({ message: "Society deleted successfully" });

    } catch (error) {
        console.error("Error deleting society: ", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @summary finds society based on id
 *  @todo  No_role_Required
 */
// router.get("/:id", async (req, res) => {
//     const { id } = req.params;
//     // let role;
//     // let universityId;
//     // let campusId;
//     let society;
//     try {
//         society = await Society.findOne({ _id: id });
//         if (!society) return res.status(404).json("no society found");

//         // Log society object before population for debugging
//         // console.log('Before populate:', society);

//         // If the role is not 'ext_org', populate the necessary fields

//         society = await society.populate([
//             'moderators',
//             'president',
//             'members',
//             'creator',
//             'societyType',
//             // 'postsCollectionRef',
//             {
//                 path: 'postsCollectionRef',
//                 populate: {
//                     path: 'posts.postId',
//                     model: 'Post',
//                     populate: [{
//                         path: 'author',
//                         model: 'User',
//                     },
//                     {
//                         path: 'voteId',
//                         model: 'SocietyPostAndCommentVote',
//                     }],
//                 },
//             },
//             'references.universityOrigin',
//             'references.campusOrigin'
//         ]);


//         // Log society object after population for debugging
//         // console.log('After populate:', society);


//         res.status(200).json(society);
//     } catch (error) {
//         console.error("Error in society.route.js ", error);
//         res.status(500).json("Internal Server Error");
//     }
// });

/**
 * @summary Finds society based on ID and returns the latest 20 posts
 * @todo No_role_Required
 */
// router.get("/:id", async (req, res) => {
//     const { id } = req.params;
//     try {
//         // Find the society and populate essential fields
//         const society = await Society.findOne({ _id: id }).populate([
//             'moderators',
//             'president',
//             'members',
//             'creator',
//             'societyType',
//             'references.universityOrigin',
//             'references.campusOrigin',
//             'postsCollectionRef'
//         ]);

//         if (!society) return res.status(404).json("No society found");

//         // Log the postsCollectionRef to check its structure
//         // console.log("test", society.postsCollectionRef); // Check the full structure

//         // Check if postsCollectionRef exists and if posts is an array
//         const postsCollection = Array.isArray(society.postsCollectionRef?.posts)
//             ? society.postsCollectionRef.posts
//             : [];

//         if (postsCollection.length === 0) {
//             return res.status(404).json("Be the first one to post");
//         }

//         // Load the latest 20 posts for the society
//         const posts = await Post.find({
//             _id: { $in: postsCollection.map(post => post.postId) },
//         })
//             .sort({ createdAt: -1 }) // Sort by latest
//             .limit(20) // Limit to 20 posts
//             .populate([
//                 { path: 'author', model: 'User' },
//                 { path: 'voteId', model: 'SocietyPostAndCommentVote' },
//             ]);

//         // console.log("posts this", posts)
//         // Assign the sorted and limited posts back to the society object
//         society.postsCollectionRef.posts = posts;

//         // console.log("\n\n\n\nsocity", { society: society, posts: posts })

//         res.status(200).json({ society: society, posts: posts });
//     } catch (error) {
//         console.error("Error in society.route.js /:id", error);
//         res.status(500).json("Internal Server Error");
//     }
// });


router.get("/types", async (req, res) => {
    try {
        const societyTypes = await SocietyType.find().select("societyType _id");
        if (!societyTypes) return res.status(404).json("no society types found");
        console.log("society types", societyTypes)
        res.status(200).json(societyTypes);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});
/**
 * @summary Finds society based on ID and returns posts with pagination
 * @param {number} page - Page number for pagination (default 1)
 * @param {number} limit - Number of posts per page (default 10)
 * @todo No_role_Required
 */
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and 10 posts per page
    const { userId } = getUserDetails(req);

    // const cacheKeySociety = `society_${id}`;
    // const cacheKeyPosts = `society_${id}_posts_page_${page}`;




    console.log("ID-", id)
    try {

        // Try fetching cached society data
        // const cachedSociety = await redisClient.get(cacheKeySociety);
        // if (cachedSociety) {
        //     const society = JSON.parse(cachedSociety);
        //     // Fetch cached posts if available
        //     const cachedPosts = await redisClient.get(cacheKeyPosts);
        //     if (cachedPosts) {
        //         return res.status(200).json({ society, posts: JSON.parse(cachedPosts) });
        //     }
        // }


        const society = await Society.findOne({ _id: id, isDeleted: false }).populate([
            'moderators',
            'president',
            'members',
            'creator',
            'societyType',
            'references.universityOrigin',
            'references.campusOrigin',
            'postsCollectionRef'
        ]);
        console.log("SOciety", society)

        if (!society) return res.status(404).json("No society found");

        // await redisClient.set(cacheKeySociety, JSON.stringify(society), 'EX', 3600);


        const postsCollection = Array.isArray(society.postsCollectionRef?.posts)
            ? society.postsCollectionRef.posts
            : [];

        if (postsCollection.length === 0) {
            return res.status(200).json({ society: society, posts: [], message: "Be the first one to post" });
        }

        const skip = (page - 1) * limit; // Calculate how many posts to skip for pagination

        const posts = await Post.find({
            _id: { $in: postsCollection.map(post => post.postId) },
        })
            .sort({ createdAt: -1 })
            .skip(skip) // Skip the calculated posts based on page
            .limit(Number(limit)) // Limit the number of posts per page
            .populate([
                { path: 'author', model: 'User' },
                { path: 'voteId', model: 'SocietyPostAndCommentVote' },
            ]);


        // await redisClient.set(cacheKeyPosts, JSON.stringify(posts), 'EX', 600); // Shorter expiry for posts


        const isMod = await Society.exists({
            _id: id,
            isDeleted: false,
            moderators: userId
        });

        let isMember = false;

        if (!isMod) {
            const memberRef = await Society.findById(id).select('members').lean();
            if (memberRef && memberRef.members) {
                const memberDoc = await Members.findById(memberRef.members).select('members').lean();
                isMember = memberDoc?.members?.some(uid => uid.toString() === userId);
            }
        }

        const isJoined = !!(isMod || isMember);



        // console.log("\n\n\n\nsocity",society, "\n\nposts", posts )
        res.status(200).json({ society: society, posts: posts, isJoined: isJoined });
    } catch (error) {
        console.error("Error in society.route.js /:id", error);
        res.status(500).json("Internal Server Error");
    }
});

router.get('/search', async (req, res) => {
    const { societyName } = req.query;
    try {
        const { userId, role } = getUserDetails(req)

        if (!societyName) {
            return res.status(404).json("societyName required for searching")
        }

        const user = await Society.find({ role: role, name: societyName, isDeleted: false })

        res.status(200).json(user.subscribedSocities)
    } catch (error) {
        console.error("Error in search society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
})

router.get('/user/subscribedSocieties', async (req, res) => {
    try {
        const { userId } = getUserDetails(req)


        const user = await User.findById({ _id: userId })
            // .select('-password subscribedSocities subscribedSubSocities')
            .populate("subscribedSocities subscribedSubSocities")

        console.log("\n\nThe /user/subscribedSocieties has Data \n", user.subscribedSocities)

        res.status(200).json(user.subscribedSocities)
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
})

/**
 * ALL University Page Default - childrens = Comsats, Fasts, UET, Bahria
 * @summary get all-uni[all parents] societies
 */
router.get("/universities/all", async (req, res) => {

    try {
        const { role } = getUserDetails(req)

        // Fetch random societies using aggregation
        const randomSocieties = await Society.aggregate([

            {
                $match: {
                    "references.role": role,
                    isDeleted: false
                }
            },
            {
                $sample: { size: 5 } // Adjust size to the number of random documents you want
            }
        ]).limit(5); // Limit to 5 random societies

        // Extract IDs of the random societies
        const societyIds = randomSocieties.map(society => society._id);

        // Use the IDs to fetch and populate society data
        const societies = await Society.find({ _id: { $in: societyIds }, isDeleted: false }).populate([
            {
                path: 'references',
                populate: {
                    path: 'universityOrigin campusOrigin',
                    select: 'name location'
                },
            },

        ]).select('-users').limit(5);

        if (!societies || societies.length === 0) {
            return res.status(404).json("No society found");
        }

        console.log("\n\nThe /universities/all has Data \n", societies)

        res.status(200).json(societies);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * ALL CAMPUS PAGE default - children = Comsats WAH+VEHARI+ATTOCK+ABBOTTABAD
 * lets assign another analogy: all campus to be university page
 * @summary get all-campus[parent and child] societies
 */
router.get("/campuses/all", async (req, res) => {


    const { universityOrigin, role } = getUserDetails(req)
    try {

        // console.log("hey", role);
        const society = await Society.find({
            isDeleted: false,
            "references.role": role,
            "references.universityOrigin": universityOrigin,
        }).populate([
            {
                path: 'references',
                populate: 'universityOrigin campusOrigin',
                select: 'name location'
            }
        ]).limit(5);
        // console.log("hey yo", society);

        if (!society) return res.status(404).json("no society found");

        console.log("\n\nThe /campuses/all has Data \n", society)

        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});
/**
 * HOME PAGE default - child itslef = Comsats Lahore ONLY
 * @summary  get one[single-child] campus-societies
 */
router.get("/campus/all", async (req, res) => {
    const { id } = req.params;

    try {
        const { universityOrigin, campusOrigin, role } = getUserDetails(req)

        const society = await Society.find({
            isDeleted: false,
            "references.role": role,
            "references.universityOrigin": universityOrigin,
            "references.campusOrigin": campusOrigin,
        }
        ).populate([
            {
                path: 'references',
                populate: 'universityOrigin campusOrigin',
                select: 'name location'
            }
        ]).limit(5);
        // path: 'postsCollectionRef',
        //                 populate: {
        //                     path: 'posts.postId',
        //                     model: 'Post',
        //                     populate: [{
        //                         path: 'author

        if (!society) return res.status(404).json("no society found");

        console.log("\n\nThe /campus/all has Data \n", society)

        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * @summary finds society based on @param {societyId}  Role__UNI__CAMPUS__and__COMPANY
 */
// router.get("/:id", async (req, res) => {
//     const { id } = req.params;
//     let role;
//     let universityOrigin;
//     let campusOrigin;

//     let society;

//     try {
//         const platform = req.headers["x-platform"];
//         if (platform === "web") {
//             role = req.session.user.role;
//             if (role !== "ext_org") {
//                 (universityOrigin = req.session.user.university.universityId._id),
//                     (campusOrigin = req.session.user.university.campusId._id);
//             }
//             // else {
//             //     // TODO IMPLEMENT LATER - to make query faster, give company id
//             //     // companyId
//             // }
//         } else if (platform === "app") {
//             role = req.user.role;
//             if (role !== "ext_org") {
//                 (universityOrigin = req.user.university.universityId._id),
//                     (campusOrigin = req.user.university.campusId._id);
//             }
//             // else {
//             //     // TODO IMPLEMENT LATER - to make query faster, give company id
//             //     // companyId
//             // }
//         }

//         society = await Society.findOne(
//             { _id: id },
//             role === "ext_org"
//                 ? { companyReference: { isCompany: true } }
//                 : {
//                     "references.role": role,
//                     "references.universityOrigin": universityOrigin,
//                     "references.campusOrigin": campusOrigin,
//                 }
//         )


//         // Log society object before population for debugging
//         // console.log('Before populate:', society);

//         // If the role is not 'ext_org', populate the necessary fields
//         if (role !== 'ext_org') {
//             society = await society.populate([
//                 'moderators',
//                 'president',
//                 'members',
//                 'creator',
//                 'societyType',
//                 'references.universityOrigin',
//                 'references.campusOrigin'
//             ]);
//         }

//         // Log society object after population for debugging
//         // console.log('After populate:', society);



//         if (!society) return res.status(404).json("no society found");
//         res.status(200).json(society);
//     } catch (error) {
//         console.error("Error in society.route.js ", error);
//         res.status(500).json("Internal Server Error");
//     }
// });

/**
 * @summary finds ALL SOCIETIES BASED ON  ROLE
 * FOR
 */
router.get("/with-company/all", async (req, res) => {

    try {
        const { role, universityOrigin, campusOrigin } = getUserDetails(req)

        const society = await Society.find(

            role === "ext_org"
                ? { companyReference: { isCompany: true }, isDeleted: false, }
                : {
                    references: {
                        role: role,
                        universityOrigin,
                        campusOrigin
                    },
                    isDeleted: false,
                }
        );

        if (!society) return res.status(404).json("no society found");
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

router.post("/request-verification", async (req, res) => {
    try {
        const { societyId, campusModeratorId, requestedBy, documentObject } =
            req.body;

        const newRequest = new VerificationRequest({
            society: societyId,
            campusModerator: campusModeratorId,
            requestedBy,
            requiredDocuments: {
                busCardImage: documentObject.busCardImage,
                studentCardImage: documentObject.studentCardImage,
                livePhoto: documentObject.livePhoto,
            },
        });
        // TODO chat schema when implemented

        await newRequest.save();

        return res
            .status(201)
            .json({ message: "Verification request sent", request: newRequest });
    } catch (error) {
        console.error("Error in verification request: ", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * get all subsocieties on basis of parent society to show society mod
 */
/**
 * @summary finds ALL SOCIETIES BASED ON  ROLE
 * FOR
 */
router.get("/sub-societies/:societyId", async (req, res) => {
    const societyId = req.params.societyId;
    try {
        const society = await SubSociety.find({ societyId: societyId, isDeleted: false, });

        if (!society) return res.status(404).json("no sub society found");
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

/***
 * @param {role} NOT_REQUIRED NOT MUST
 *
 */
router.post("/role-based/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { role } = getUserDetails(req);
        const society = await Society.findOne(
            { _id: id },
            { "references.role": role, isDeleted: false, }
        );

        if (!society)
            return res.status(404).json("no society found in " + role);
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

/***
 *  For Companies
 */
router.get("/ext-org/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // if (!(req.session.user.role === 'ext_org')) return res.status(404).json("role mismatch error")
        const society = await Society.findOne(
            { _id: id },
            { "companyReference.isCompany": true, isDeleted: false, }
        );

        if (!society) return res.status(404).json("no society found in ");
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});
/***
 *  For Companies
 */
router.get("/ext-org/:companyId", async (req, res) => {
    const { companyId } = req.params;

    try {
        // if (!(req.session.user.role === 'ext_org')) return res.status(404).json("role mismatch error")
        const society = await Society.findOne(
            { "companyReference.companyOrigin": companyId },
            { "companyReference.isCompany": true, isDeleted: false, }
        );

        if (!society) return res.status(404).json("no society found in " + type);
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

router.get("/join/:societyId", async (req, res) => {
    const { societyId } = req.params;

    console.log("society join", societyId)
    try {
        const { role, userId } = getUserDetails(req)

        console.log(role, userId, "/;hhh", societyId)
        // Fetch the society and validate the role
        const society = await Society.findOne({ _id: societyId, isDeleted: false, });
        if (!society) return res.status(404).json({ error: "Society not found" });
        if (!society.allows.includes(role) && !society.allows.includes("all"))
            return res.status(403).json({ message: `Society does not allow role: ${role}` });


        // Check if the user is already a member
        const isAlreadyMember = await Members.findOne({
            societyId: societyId,
            members: userId,
        });

        if (isAlreadyMember) {
            return res.status(200).json({
                message: "User is already a member of the society",
                joined: true,
                society,
            });
        }

        // Update the society atomically
        const updatedSociety = await Society.findOneAndUpdate(
            { _id: societyId, },
            {
                // $addToSet: { 'members.members': userId }, //{} Avoid duplicate members
                $inc: { totalMembers: 1 },
            },
            { new: true } // Return the updated document
        );

        if (!updatedSociety)
            return res.status(404).json({ error: "Failed to update society" });

        // Optional: Sync with Members collection if necessary
        await Members.updateOne(
            { societyId: societyId },
            { $addToSet: { members: [userId] } },
            { upsert: true } // Create document if it doesn't exist
        );

        await User.findByIdAndUpdate(
            { _id: userId },
            {
                $addToSet: {
                    subscribedSocities: updatedSociety._id,
                },
            }
        );

        return res
            .status(200)
            .json({
                message: "Joined society successfully",
                society: updatedSociety,
                joined: true
            });
    } catch (error) {
        console.error("Error in join-society route: ", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/leave/:societyId", async (req, res) => {
    const { societyId } = req.params;
    try {
        const { role, userId } = getUserDetails(req)

        // Fetch the society and validate existence
        const society = await Society.findOne({ _id: societyId })
            .populate("members")
            .select("_id");
        if (!society) return res.status(404).json({ error: "Society not found" });

        // Check if the user is already a member
        if (!society.members.members.includes(userId)) {
            return res.status(400).json({ error: "You are not a member of this society" });
        }

        // Update the society to remove the user
        const updatedSociety = await Society.findOneAndUpdate(
            { _id: societyId },
            {
                // $pull: { 'members.members': userId }, // Remove user from members array
                $inc: { totalMembers: -1 }, // Decrement the total member count
            },
            { new: true } // Return the updated document
        );

        if (!updatedSociety)
            return res.status(404).json({ error: "Failed to update society" });

        await Members.updateOne({ societyId: societyId }, { $pull: { members: userId } });

        await User.findByIdAndUpdate(
            { _id: userId },
            {
                $pull: {
                    'profile.moderatorTo.society': updatedSociety._id,
                    subscribedSocities: updatedSociety._id,
                },
            }
        );

        return res
            .status(200)
            .json({ message: "Left society successfully", society: updatedSociety });
    } catch (error) {
        console.error("Error in leave-society route: ", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/user-subscribed", async (req, res) => {
    let role;
    let userId;

    try {
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            role = req.session.user.role;
            userId = req.session.user._id;
        } else if (platform === "app") {
            role = req.user.role;
            userId = req.user._id;
            return res.status(501).json("Platform not supported yet");
        }

        const subscribedSocities = await User.findById({ _id: userId })
            .select("-password")
            .populate("subscribedSocities");

        return res.status(200).json({ message: "Found", subscribedSocities });
    } catch (error) {
        console.error("Error in join-subSociety route: ", error);
        res.status(500).json("Internal Server Error");
    }
});



/**
 * finds public societies basis on your role
 */
router.get('/public/societies', async (req, res) => {
    let { role, universityOrigin, campusOrigin } = getUserDetails(req);
    try {

        const societies = await Society.find({
            isDeleted: false,
            "references.role": role,
            "references.universityOrigin": universityOrigin,
            "references.campusOrigin": campusOrigin
        })
            .select('name _id societyType')
            .populate('societyType')
        // console.log("Hi-soc", societies)

        const filteredSocieties = societies.filter(
            society => society.societyType.societyType === 'public'
        );
        // console.log("Hi-soc2", filteredSocieties)

        console.log("\n\nThe /public/societies has Data \n", societies)

        // setTimeout(() => {
        //     res.status(200).json(filteredSocieties);
        // }, 10000);
        res.status(200).json(filteredSocieties);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * PAGINATED: Get all-uni[all parents] societies (paginated)
 */
router.get("/paginated/universities/all", async (req, res) => {
    try {
        const { role } = getUserDetails(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const match = { "references.role": role, isDeleted: false, };
        console.log("[/paginated/universities/all] match:", match, "page:", page, "limit:", limit, "skip:", skip);
        const total = await Society.countDocuments(match);
        const societies = await Society.find(match)
            .populate([
                {
                    path: 'references',
                    populate: {
                        path: 'universityOrigin campusOrigin',
                        select: 'name location'
                    },
                }
            ])
            .select('-users')
            .skip(skip)
            .limit(limit);
        console.log("[/paginated/universities/all] societies:", societies.length, "total:", total);
        res.status(200).json({
            data: societies,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error in society.route.js /paginated/universities/all", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * PAGINATED: Get all-campus[parent and child] societies (paginated)
 */
router.get("/paginated/campuses/all", async (req, res) => {
    try {
        const { universityOrigin, role } = getUserDetails(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const match = {
            "references.role": role,
            "references.universityOrigin": universityOrigin,
            isDeleted: false,
        };
        console.log("[/paginated/campuses/all] match:", match, "page:", page, "limit:", limit, "skip:", skip);
        const total = await Society.countDocuments(match);
        const societies = await Society.find(match)
            .populate([
                {
                    path: 'references',
                    populate: 'universityOrigin campusOrigin',
                    select: 'name location'
                }
            ])
            .skip(skip)
            .limit(limit);
        console.log("[/paginated/campuses/all] societies:", societies.length, "total:", total);
        res.status(200).json({
            data: societies,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error in society.route.js /paginated/campuses/all", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * PAGINATED: Get one[single-child] campus-societies (paginated)
 */
router.get("/paginated/campus/all", async (req, res) => {
    try {
        const { universityOrigin, campusOrigin, role } = getUserDetails(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const match = {
            "references.role": role,
            "references.universityOrigin": universityOrigin,
            "references.campusOrigin": campusOrigin,
            isDeleted: false,
        };
        console.log("[/paginated/campus/all] match:", match, "page:", page, "limit:", limit, "skip:", skip);
        const total = await Society.countDocuments(match);
        const societies = await Society.find(match)
            .populate([
                {
                    path: 'references',
                    populate: 'universityOrigin campusOrigin',
                    select: 'name location'
                }
            ])
            .skip(skip)
            .limit(limit);
        console.log("[/paginated/campus/all] societies:", societies.length, "total:", total);
        res.status(200).json({
            data: societies,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error in society.route.js /paginated/campus/all", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * PAGINATED: finds public societies basis on your role (paginated)
 */
router.get('/paginated/public/societies', async (req, res) => {
    let { role, universityOrigin, campusOrigin } = getUserDetails(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const match = {
            "references.role": role,
            "references.universityOrigin": universityOrigin,
            "references.campusOrigin": campusOrigin,
            isDeleted: false,
        };
        console.log("[/paginated/public/societies] match:", match, "page:", page, "limit:", limit, "skip:", skip);
        const total = await Society.countDocuments(match);
        const societies = await Society.find(match)
            .select('name _id societyType')
            .populate('societyType')
            .skip(skip)
            .limit(limit);
        const filteredSocieties = societies.filter(
            society => society.societyType.societyType === 'public'
        );
        console.log("[/paginated/public/societies] societies:", societies.length, "filtered:", filteredSocieties.length, "total:", total);
        res.status(200).json({
            data: filteredSocieties,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error in society.route.js /paginated/public/societies", error);
        res.status(500).json("Internal Server Error");
    }
});


router.post("/delete/:societyId", async (req, res) => {
    const { societyId } = req.params;
    try {
        const { userId } = getUserDetails(req);

        // Find the society and check if the user is authorized
        const society = await Society.findOne({ _id: societyId });
        if (!society) {
            return res.status(404).json({ error: "Society not found" });
        }

        // Check if the user is a moderator or creator
        if (!society.moderators.includes(userId) && society.creator.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this society" });
        }

        // Delete associated data
        // 1. Delete members collection
        await Members.deleteOne({ societyId: societyId });

        // 2. Delete posts collection and individual posts
        const postsCollection = await PostsCollection.findOne({ societyId: societyId });
        if (postsCollection) {
            await Post.deleteMany({ _id: { $in: postsCollection.posts.map(post => post.postId) } });
            await PostsCollection.deleteOne({ societyId: societyId });
        }

        // 3. Delete verification requests
        await VerificationRequest.deleteMany({ society: societyId });

        // 4. Delete sub-societies
        await SubSociety.deleteMany({ societyId: societyId });

        // 5. Update users' subscribed societies and moderator roles
        await User.updateMany(
            { subscribedSocities: societyId },
            { $pull: { subscribedSocities: societyId } }
        );
        await User.updateMany(
            { 'profile.moderatorTo.society': societyId },
            { $pull: { 'profile.moderatorTo.society': societyId } }
        );

        // 6. Delete the society itself
        await Society.deleteOne({ _id: societyId });

        // Invalidate Redis cache (handle gracefully)
        try {
            // Delete specific society cache
            await redisClient.del(`society_${societyId}`);

            // For node-redis v4+, use SCAN to find and delete post-related keys
            const pattern = `society_${societyId}_posts_page_*`;
            for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
                await redisClient.del(key);
            }
        } catch (redisError) {
            console.error("Error invalidating Redis cache: ", redisError);
            // Continue execution even if cache invalidation fails
        }

        return res.status(200).json({ message: "Society deleted successfully" });
    } catch (error) {
        console.error("Error in delete-society route: ", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
