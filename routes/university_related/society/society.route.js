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
const router = express.Router();

router.post("/create-SocietyTypes", async (req, res) => {
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
        let role;
        let userId;
        let universityId;
        let campusId;
        let companyId;
        // get societyTypes from cache later on
        const {
            name,
            description,
            societyTypeId,
            category,
            icon,
            banner,
            allows,
            president,
        } = req.body;

        // console.log("hi", "\n\n", req.session.user, "\n\n")

        // console.log("jere", req.body);
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            userId = req.session.user._id;
            role = req.session.user.role;
            if (role !== "ext_org") {
                (universityId = req.session.user.university.universityId._id),
                    (campusId = req.session.user.university.campusId._id);
            }
            // else{
            //     companyId = null;
            // }
        }
        if (platform === "app") {
            userId = req.user._id;
            role = req.user.role;
            if (role !== "ext_org") {
                (universityId = req.user.university.universityId._id),
                    (campusId = req.user.university.campusId._id);
            }
        }
        // else { }

        const alreadyExists = await Society.findOne(
            { name: name },
            role === "ext_org"
                ? { companyReference: { isCompany: true } }
                : {
                    references: {
                        role: role,
                        universityId,
                        campusId,
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
            ...(role === "ext_org"
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
                        universityOrigin: universityId,
                        campusOrigin: campusId,
                    },
                }),
            allows: [allows ? allows : userId.role],
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
                moderatorTo: {
                    society: [newSociety._id],
                },
                subscribedSocities: [newSociety._id]

            }
        );

        const postsCollectionRef = new PostsCollection({
            _id: newSociety._id,
            societyId: newSociety._id,
            ...(role === "ext_org"
                ? {
                    companyReference: {
                        isCompany: true,
                        companyOrigin: companyId,
                    },
                }
                : {
                    references: {
                        role: role,
                        universityOrigin: universityId,
                        campusOrigin: campusId,
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


/**
 * @summary Finds society based on ID and returns posts with pagination
 * @param {number} page - Page number for pagination (default 1)
 * @param {number} limit - Number of posts per page (default 10)
 * @todo No_role_Required
 */
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and 10 posts per page

    try {
        const society = await Society.findOne({ _id: id }).populate([
            'moderators',
            'president',
            'members',
            'creator',
            'societyType',
            'references.universityOrigin',
            'references.campusOrigin',
            'postsCollectionRef'
        ]);

        if (!society) return res.status(404).json("No society found");

        const postsCollection = Array.isArray(society.postsCollectionRef?.posts)
            ? society.postsCollectionRef.posts
            : [];

        if (postsCollection.length === 0) {
            return res.status(404).json("Be the first one to post");
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

        res.status(200).json({ society: society, posts: posts });
    } catch (error) {
        console.error("Error in society.route.js /:id", error);
        res.status(500).json("Internal Server Error");
    }
});



router.get('/user/subscribedSocieties', async (req, res) => {
    let userId;
    try {
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            userId = req.session.user._id;
        } else if (platform === "app") {
            userId = req.user._id;
        }


        const user = await User.findById({ _id: userId })
            // .select('-password subscribedSocities subscribedSubSocities')
            .populate("subscribedSocities subscribedSubSocities")

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
    let role;
    try {
        if (role === "ext_org")
            return res.status(417).json("EXT Cant Access this route");
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            role = req.session.user.role;
        } else if (platform === "app") {
            role = req.user.role;
        }
        const society = await Society.find({
            "references.role": role,
        });

        if (!society) return res.status(404).json("no society found");
        res.status(200).json(society);
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
    let role;
    let universityOrigin;
    try {
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            role = req.session.user.role;
            if (role !== "ext_org") {
                universityOrigin = req.session.user.university.universityId._id;
            }
        } else if (platform === "app") {
            role = req.user.role;
            if (role !== "ext_org") {
                universityOrigin = req.user.university.universityId._id;
            }
        }
        // console.log("hey", role);
        const society = await Society.find({
            "references.role": role,
            "references.universityOrigin": universityOrigin,
        });
        // console.log("hey yo", society);

        if (!society) return res.status(404).json("no society found");
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
    let role;
    let universityOrigin;
    let campusOrigin;
    try {
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            role = req.session.user.role;
            if (role !== "ext_org") {
                (universityOrigin = req.session.user.university.universityId._id),
                    (campusOrigin = req.session.user.university.campusId._id);
            }
        } else if (platform === "app") {
            role = req.user.role;
            if (role !== "ext_org") {
                (universityOrigin = req.user.university.universityId._id),
                    (campusOrigin = req.user.university.campusId._id);
            }
        }
        const society = await Society.find(
            { _id: id },

            {
                "references.role": role,
                "references.universityOrigin": universityOrigin,
                "references.campusOrigin": campusOrigin,
            }
        );

        if (!society) return res.status(404).json("no society found");
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
    let role;
    let universityId;
    let campusId;
    try {
        const platform = req.headers["x-platform"];
        if (platform === "web") {
            role = req.session.user.role;
            if (role !== "ext_org") {
                (universityId = req.session.user.university.universityId._id),
                    (campusId = req.session.user.university.campusId._id);
            }
            // else {
            //     // TODO IMPLEMENT LATER - to make query faster, give company id
            //     // companyId
            // }
        } else if (platform === "app") {
            userId = req.user._id;
            role = req.user.role;
            if (role !== "ext_org") {
                (universityId = req.user.university.universityId._id),
                    (campusId = req.user.university.campusId._id);
            }
            // else {
            //     // TODO IMPLEMENT LATER - to make query faster, give company id
            //     // companyId
            // }
        }
        const society = await Society.find(
            role === "ext_org"
                ? { companyReference: { isCompany: true } }
                : {
                    references: {
                        role: role,
                        universityId,
                        campusId,
                    },
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
        const society = await SubSociety.find({ societyId: societyId });

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
    let roleFromMiddleware;

    try {
        const platform = req.header["x-platform"];

        if (platform === "web") {
            roleFromMiddleware = req.session.user.role;
        } else if (platform === "app") {
            roleFromMiddleware = req.user.role;
        }

        if (!roleFromMiddleware) return res.status(404).json("role required");
        const society = await Society.findOne(
            { _id: id },
            { "references.role": roleFromMiddleware }
        );

        if (!society)
            return res.status(404).json("no society found in " + roleFromMiddleware);
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
            { "companyReference.isCompany": true }
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
            { "companyReference.isCompany": true }
        );

        if (!society) return res.status(404).json("no society found in " + type);
        res.status(200).json(society);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});

router.post("/join-society/:societyId", async (req, res) => {
    const { societyId } = req.params;
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

        // Fetch the society and validate the role
        const society = await Society.findOne({ _id: societyId });
        if (!society) return res.status(404).json("Society not found");
        if (!society.allows.includes(role))
            return res.status(403).json(`Society does not allow role: ${role}`);


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
            { _id: societyId },
            {
                // $addToSet: { 'members.members': userId }, //{} Avoid duplicate members
                $inc: { totalMembers: 1 },
            },
            { new: true } // Return the updated document
        );

        if (!updatedSociety)
            return res.status(404).json("Failed to update society");

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
        res.status(500).json("Internal Server Error");
    }
});

router.post("/leave-society/:id", async (req, res) => {
    const { id } = req.params;
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

        // Fetch the society and validate existence
        const society = await Society.findOne({ _id: id })
            .populate("members")
            .select("_id");
        if (!society) return res.status(404).json("Society not found");

        // Check if the user is already a member
        if (!society.members.members.includes(userId)) {
            return res.status(400).json("You are not a member of this society");
        }

        // Update the society to remove the user
        const updatedSociety = await Society.findOneAndUpdate(
            { _id: id },
            {
                // $pull: { 'members.members': userId }, // Remove user from members array
                $inc: { totalMembers: -1 }, // Decrement the total member count
            },
            { new: true } // Return the updated document
        );

        if (!updatedSociety)
            return res.status(404).json("Failed to update society");

        await Members.updateOne({ societyId: id }, { $pull: { members: userId } });

        await User.findByIdAndUpdate(
            { _id: userId },
            {
                $pull: {
                    subscribedSocities: updatedSociety._id,
                },
            }
        );

        return res
            .status(200)
            .json({ message: "Left society successfully", society: updatedSociety });
    } catch (error) {
        console.error("Error in leave-society route: ", error);
        res.status(500).json("Internal Server Error");
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

        // setTimeout(() => {
        //     res.status(200).json(filteredSocieties);
        // }, 10000);
        res.status(200).json(filteredSocieties);
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});


module.exports = router;
