const express = require('express');
const SocietyType = require('../../../models/society/society.type.model');
const SubSociety = require('../../../models/society/sub.society.model');
const Society = require('../../../models/society/society.model');
const PostsCollection = require('../../../models/society/post/collection/post.collection.model');
const Members = require('../../../models/society/members.collec.model');
const User = require('../../../models/user/user.model');
const router = express.Router();



/**
 * 
 * Create a sub scoiety 
 * @param {societyId} ObjectId parent society
 * creates a sub-society
 */
/**
* @param {icon,banner} url_link
*/
router.post("/create", async (req, res) => {
    try {
        let role;
        let userId;
        let universityId;
        let campusId;

        // get societyTypes from cache later on
        const { name, description, societyId, societyTypeId, category, icon, banner, } = req.body;

        if (!societyId) return res.status(404).json("Society Id not privided")

        const platform = req.headers['x-platform']
        if (platform === 'web') {
            userId = req.session.user._id
            role = req.session.user.role
            if (role !== 'ext_org') {
                universityId = req.session.university.universityId._id,
                    campusId = req.session.university.campus._id
            }

        }
        if (platform === 'app') {
            userId = req.user._id
            role = req.user.role
            if (role !== 'ext_org') {
                universityId = req.user.university.universityId._id,
                    campusId = req.user.university.campus._id
            }
        }
        // else { }
        const societyExists = await Society.findOne({ societyId: societyId },
            (role === "ext_org")
                ? { companyReference: { isCompany: true } }
                :
                {
                    references: {
                        role: role,
                        universityId,
                        campusId
                    }
                }
        )
        if (!societyExists) return res.status(302).json('Society doesnot Exists')




        const alreadyExists = await SubSociety.findOne({ name: name },
            (role === "ext_org")
                ? { companyReference: { isCompany: true } }
                :
                {
                    references: {
                        role: role,
                        universityId,
                        campusId
                    }
                }
        )
        if (alreadyExists) return res.status(302).json('Society already Exists')

        const societyTypeIdExists = await SocietyType.findById(societyTypeId)
        if (societyTypeIdExists) return res.status(302).json('Society Type invalid')

        const newSubSociety = new SubSociety({
            societyId: societyExists._id,
            name: name + "-" + societyExists.name,
            description,
            category,
            icon: icon ? icon : societyExists.icon,
            banner: banner ? banner : societyExists.banner,
            creator: userId,
            moderators: [userId],
            totalMembers: 1,
            societyType: societyTypeIdExists._id,
            ...(role === "ext_org"
                ? { companyReference: { isCompany: true, companyOrigin: userId } }
                : { references: { role, universityOrigin: universityId, campusOrigin: campusId } }
            ),
            allows: [user.role]
        });

        await newSubSociety.save();


        const postsCollectionRef = await PostsCollection.create({
            subSocietyId: newSubSociety._id,
            ...(role === "ext_org"
                ?
                {
                    companyReference: {
                        isCompany: true,
                        companyOrigin: companyId,
                    }
                } :
                {
                    references: {
                        universityOrigin: universityId,
                        campusOrigin: campusId,
                    }
                }),
        })

        await postsCollectionRef.save();

        newSubSociety.postsCollectionRef = postsCollectionRef._id
        await newSubSociety.save()

        return res.status(201).json({ message: "Society created successfully", society: newSubSociety });
    } catch (error) {
        console.error("Error creating society: ", error);
        res.status(500).json("Internal Server Error");
    }
});

/**
 * get a sub society normally
 * @param {subSocietyId} ObjectId sub socity id required
 * 
 */
router.get("/:subSocietyId", async (req, res) => {
    const { subSocietyId } = req.params;

    try {

        const subSociety = await SubSociety.findOne({ _id: subSocietyId })
        if (!subSociety) return res.status(404).json("no society found")
        res.status(200).json(subSociety)
    } catch (error) {
        console.error("Error in society.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});




/**
 * ALL University Page Default - childrens = Comsats, Fasts, UET, Bahria
 * @summary get all-uni[all parents] societies
 */
router.get("/universities/all", async (req, res) => {

    let role;
    try {
        if (role === 'ext_org') return res.status(417).json("EXT Cant Access this route")
        const platform = req.headers['x-platform']
        if (platform === 'web') {
            role = req.session.user.role

        } else if (platform === 'app') {
            role = req.user.role
        }
        const subSociety = await SubSociety.find(
            {
                references: {
                    role: role
                }
            }
        )


        if (!subSociety) return res.status(404).json("no subSociety found")
        res.status(200).json(subSociety)
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
    let universityId;
    try {
        const platform = req.headers['x-platform']
        if (platform === 'web') {
            role = req.session.user.role
            if (role !== 'ext_org') {
                universityId = req.session.university.universityId._id
            }
        } else if (platform === 'app') {
            role = req.user.role
            if (role !== 'ext_org') {
                universityId = req.user.university.universityId._id
            }
        }
        const subSociety = await SubSociety.find(
            {
                references: {
                    role: role,
                    universityId
                }
            }
        )


        if (!subSociety) return res.status(404).json("no subSociety found")
        res.status(200).json(subSociety)
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
    let universityId;
    let campusId;
    try {
        const platform = req.headers['x-platform']
        if (platform === 'web') {
            role = req.session.user.role
            if (role !== 'ext_org') {
                universityId = req.session.university.universityId._id,
                    campusId = req.session.university.campus._id
            }
        } else if (platform === 'app') {
            userId = req.user._id
            role = req.user.role
            if (role !== 'ext_org') {

                universityId = req.user.university.universityId._id,
                    campusId = req.user.university.campus._id
            }
        }
        const subSociety = await SubSociety.findOne({ _id: id },

            {
                references: {
                    role: role,
                    universityId,
                    campusId
                }
            }
        )


        if (!subSociety) return res.status(404).json("no subSociety found")
        res.status(200).json(subSociety)
    } catch (error) {
        console.error("Error in subSociety.route.js ", error);
        res.status(500).json("Internal Server Error");
    }
});






router.post("/join-sub-society/:id", async (req, res) => {
    const { id } = req.params;
    let role;
    let userId;

    try {
        const platform = req.headers['x-platform'];
        if (platform === 'web') {
            role = req.session.user.role;
            userId = req.session.user._id;
        } else if (platform === 'app') {

            role = req.user.role;
            userId = req.user._id;
            return res.status(501).json("Platform not supported yet");
        }

        // Fetch the society and validate the role
        const subSociety = await SubSociety.findOne({ _id: id });
        if (!subSociety) return res.status(404).json("subSociety not found");
        if (!subSociety.allows.includes(role)) return res.status(403).json(`subSociety does not allow role: ${role}`);

        // Update the subSociety atomically
        const updatedsubSociety = await SubSociety.findOneAndUpdate(
            { _id: id },
            {
                // $addToSet: { 'members.members': userId }, //{} Avoid duplicate members
                $inc: { totalMembers: 1 }
            },
            { new: true } // Return the updated document
        );

        if (!updatedsubSociety) return res.status(404).json("Failed to update subSociety");

        // Optional: Sync with Members collection if necessary
        await Members.updateOne(
            { subSocietyId: id },
            { $addToSet: { members: userId } },
            { upsert: true } // Create document if it doesn't exist
        );

        await User.findByIdAndUpdate({ _id: userId }, {
            $addToSet: {
                subscribedSubSocities: updatedsubSociety._id,
            }
        })




        return res.status(200).json({ message: "Joined subSociety successfully", subSociety: updatedsubSociety });
    } catch (error) {
        console.error("Error in join-subSociety route: ", error);
        res.status(500).json("Internal Server Error");
    }
});

router.post("/leave-sub-society/:id", async (req, res) => {
    const { id } = req.params;
    let role;
    let userId;

    try {
        const platform = req.headers['x-platform'];
        if (platform === 'web') {
            role = req.session.user.role;
            userId = req.session.user._id;
        } else if (platform === 'app') {

            role = req.user.role;
            userId = req.user._id;
            return res.status(501).json("Platform not supported yet");
        }

        // Fetch the society and validate existence
        const society = await SubSociety.findOne({ _id: id }).populate('members').select('_id');
        if (!society) return res.status(404).json("SubSociety not found");

        // Check if the user is already a member
        if (!society.members.members.includes(userId)) {
            return res.status(400).json("You are not a member of this society");
        }

        // Update the society to remove the user
        const updatedSubSociety = await SubSociety.findOneAndUpdate(
            { _id: id },
            {
                // $pull: { 'members.members': userId }, // Remove user from members array
                $inc: { totalMembers: -1 }          // Decrement the total member count
            },
            { new: true } // Return the updated document
        );

        if (!updatedSubSociety) return res.status(404).json("Failed to update society");

        // Optional: Sync with Members collection if necessary
        await Members.updateOne(
            { subSocietyId: id },
            { $pull: { members: userId } }
        );

        await User.findByIdAndUpdate({ _id: userId }, {

            $pull: {
                subscribedSubSocities: updatedSubSociety._id,
            }
        })

        return res.status(200).json({ message: "Left society successfully", subSociety: updatedSubSociety });
    } catch (error) {
        console.error("Error in leave-society route: ", error);
        res.status(500).json("Internal Server Error");
    }
});







router.get("/user-subscribed", async (req, res) => {
    let role;
    let userId;

    try {
        const platform = req.headers['x-platform'];
        if (platform === 'web') {
            role = req.session.user.role;
            userId = req.session.user._id;
        } else if (platform === 'app') {

            role = req.user.role;
            userId = req.user._id;
            return res.status(501).json("Platform not supported yet");
        }



        const subscribedSocities = await User.findById({ _id: userId }).select("-password").populate('subscribedSubSocities')




        return res.status(200).json({ message: "Found", subscribedSocities });
    } catch (error) {
        console.error("Error in join-subSociety route: ", error);
        res.status(500).json("Internal Server Error");
    }
});

module.exports = router;