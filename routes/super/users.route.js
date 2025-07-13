const ModUserCollection = require('../../models/mod/mod.collection.model');
const ModUser = require('../../models/mod/mod.model');
const ModRequest = require('../../models/mod/mod.request.model');

const User = require('../../models/user/user.model');
const UserRoles = require('../../models/userRoles');
const { getUserDetails } = require('../../utils/utils');

const router = require('express').Router();

// router.put('/user/ban', async (req, res) => {
//     try {
//         const { userId } = getUserDetails(req)
//         const { userUID } = req.query;

//         const userExistsAndBanned = await User.findByIdAndUpdate(userUID, {
//             restrictions: {
//                 blocking: {
//                     isBlocked: true,
//                     reason: reason,
//                     blockedBy: userId,
//                 }
//             }
//         });
//     } catch (e) {

//     }
// });


router.get("/search", async (req, res) => {
    try {
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Search term is required" });
        }

        const usersFound = await User.find({
            name: { $regex: name, $options: "i" } // case-insensitive partial match
        }).limit(50);

        res.status(200).json({ results: usersFound });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error handling search request" });
    }
});


router.get("/admin/mod-request/all", async (req, res) => {
    try {
        const request = await ModRequest.find().populate([
            { path: 'userId', select: '_id name universityEmail' },
            { path: 'universityId', select: '_id name' },
            { path: 'campusId', select: '_id name' }
        ]);
        // console.log("REQUEST", request)
        if (!request) {
            return res.status(404).json({ modRequests: [], error: "Mod request not found" });
        }


        return res.json({ modRequests: request || [] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error handling mod request" });
    }
});

router.get("/admin/mod-request/:campusOrigin", async (req, res) => {
  try {
    const { campusOrigin } = req.params;

    const collection = await ModUserCollection.findById(campusOrigin).populate([
      {
        path: "nowModUsers",
        model: "ModUser",
      },
      {
        path: "prevModUsers.userId",
        model: "User",
        select: "_id name universityEmail",
      },
    ]);

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    // Extract userIds from nowModUsers
    const nowModUserIds = collection.nowModUsers.map((modUser) => modUser._id);

    // Fetch matching users
    const userDocs = await User.find({
      _id: { $in: nowModUserIds },
    }).select("_id name universityEmail");

    // Merge mod user + user info
    const nowModUsersWithUserInfo = collection.nowModUsers.map((modUser) => {
      const user = userDocs.find((u) => u._id.toString() === modUser._id.toString());
      return {
        modUser,
        user,
      };
    });

    return res.json({
      modcollection: {
        ...collection.toObject(),
        nowModUsers: nowModUsersWithUserInfo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error handling mod request" });
  }
});



router.put('/user/promote/mod', async (req, res) => {
    try {
        const { userId, reason, timePlan, universityOrigin, campusOrigin } = req.body;

        const yearPlan = Object.freeze({
            YEAR: 'year',
            SIX_MONTH: 'six_month',
        });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "No Such User" });

        const startTime = Date.now();

        const timePeriod =
            timePlan?.toLowerCase() === yearPlan.YEAR ? yearPlan.YEAR : yearPlan.SIX_MONTH;
        const endTime = timePeriod === yearPlan.YEAR
            ? startTime + 365 * 24 * 60 * 60 * 1000 // 1 year in ms
            : startTime + 182 * 24 * 60 * 60 * 1000; // approx. 6 months
            const modExists = await ModUser.findById(user._id)
        if(modExists && user.super_role == UserRoles.UserSuperRoles.mod){

            return res.status(400).json({ error: "User is already a moderator" });
        }
        if(modExists && user.super_role == UserRoles.UserSuperRoles.none){
        const findAndUpdate = await ModUser.findByIdAndUpdate(user._id, {
            endTime,
            reason,
            timePeriod,
            universityOrigin,
            campusOrigin,
        });
        await ModRequest.findOneAndUpdate({userId: userId}, {
            status: "approved",
            updatedAt: Date.now(),
        });
    }  else{
        await ModUser.create({
            _id: userId,
            startTime,
            endTime,
            reason,
            timePeriod,
            universityOrigin,
            campusOrigin,
        });
       await  ModRequest.findOneAndUpdate({userId: userId}, {
            status: "approved",
            updatedAt: Date.now(),
        });
    }

        await User.findByIdAndUpdate(userId, {
            super_role: UserRoles.UserSuperRoles.mod,
        });

        await ModUserCollection.findByIdAndUpdate(
            campusOrigin,
            {
                $addToSet: {
                    nowModUsers: userId,
                },
            },
            { upsert: true }
        );

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Something went wrong" });
    }
});



router.put('/user/demote/mod', async (req, res) => {
    try {
        const { userId, campusOrigin, notModAnymoreReason } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "No Such User" });

        await User.findByIdAndUpdate(userId, {
            super_role: UserRoles.UserSuperRoles.none,
        });

        // Get startTime from ModUser before deletion
        const modUserData = await ModUser.findById(userId);
        const startTime = modUserData?.startTime || null;
        const predefinedEndTime = modUserData?.endTime || Date.now();

        await ModUser.findByIdAndUpdate(userId, {isNotModAnymore: true, notModAnymoreReason} );
        await ModRequest.findOneAndUpdate({userId: userId}, {
            status: "rejected",
            updatedAt: Date.now(),
        });
        await ModUserCollection.findByIdAndUpdate(
            campusOrigin,
            {
                $pull: { nowModUsers: userId  },
                $addToSet: {
                    prevModUsers: {
                        userId,
                        startTime,
                        predefinedEndTime,
                        endTime: Date.now(),
                    },
                },
            },
            { upsert: true }
        );

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Something went wrong" });
    }
});


// approve or reject mod request
router.put("/admin/mod-request/handle", async (req, res) => {
    try {
        const { requestId, action, reason,rejectionReason, timePlan } = req.body;
console.log("REQUESTID",requestId, action, rejectionReason, timePlan, req.body)
        const request = await ModRequest.findById(requestId);
        console.log("REQUEST", request)
        if (!request || request.status !== "pending") {
            return res.status(404).json({ error: "Mod request not found or already processed" });
        }
        

        if (action === "approve") {

            request.status = "approved";
            request.reviewedAt = Date.now();
            await request.save();

            

            const yearPlan = Object.freeze({
                YEAR: 'year',
                SIX_MONTH: 'six_month',
            });

            const startTime = Date.now();
            const timePeriod =
                timePlan?.toLowerCase() === yearPlan.YEAR ? yearPlan.YEAR : yearPlan.SIX_MONTH;
            const endTime = timePeriod === yearPlan.YEAR ? startTime + 365 * 24 * 60 * 60 * 1000 : startTime + 182 * 24 * 60 * 60 * 1000;
            await ModUser.create({
                _id: request.userId,
                startTime,
                endTime,
                reason: reason,
                timePeriod,
                universityOrigin:request.universityId,
                campusOrigin:request.campusId,
            });

            await User.findByIdAndUpdate(request.userId, {
                super_role: UserRoles.UserSuperRoles.mod,
            });
            const userId= request.userId

            await ModUserCollection.findByIdAndUpdate(
                request.campusId,
                {
                    $addToSet: {
                        nowModUsers: userId,
                    },
                },
                { upsert: true }
            );

            return res.json({ message: "Mod request approved" });
        } else if (action === "reject") {
            request.status = "rejected";
            request.rejectionReason = rejectionReason;
            request.reviewedAt = Date.now();
            await request.save();

            return res.json({ message: "Mod request rejected" });
        } else {
            return res.status(400).json({ error: "Invalid action" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error handling mod request" });
    }
});




module.exports = router;