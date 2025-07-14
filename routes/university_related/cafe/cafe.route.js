const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const CafeUser = require('../../../models/cafes_campus/cafe.user.model');
const Cafe = require('../../../models/cafes_campus/cafe.model');
const cafeProtectedRoutes = require('./protected/cafe.protected.routes');
const cafeProtect = require('../../../middlewares/cafe.protect');
const { getUserDetails } = require('../../../utils/utils');
const FoodItem = require('../../../models/cafes_campus/food.item.model');
const CafeVote = require('../../../models/cafes_campus/ratings/vote/vote.cafe.model');
const CafeItemRating = require('../../../models/cafes_campus/ratings/rating.cafe.item.model');

router.use('/user', cafeProtect, cafeProtectedRoutes);

// Login route
router.post('/login', [
    body('identifier').notEmpty().withMessage('Username, email or phone is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const platform = req.headers['x-platform'];
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, password } = req.body;
        console.log("Cafe user1", identifier, password )

        // Find user by username, email or phone
        const user = await CafeUser.findOne({
            $or: [
                { username: identifier.toLowerCase() },
                { email: identifier.toLowerCase() },
                { phone: identifier }
            ]
        }).populate([
            { path: 'attachedCafe', select: 'name _id' },
            { path: 'references.universityId', select: 'name _id' },
            { path: 'references.campusId', select: 'name _id' }]
        );
        console.log("Cafe user", user,identifier, password )

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // const isMatch = await bcrypt.compare(password, user.password);
        const isMatch = password === user.password;
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const userPayload = {
            userId: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            attachedCafe: user.attachedCafe,
            university: user.references.universityId,
            campus: user.references.campusId
        };

        if (platform === "web") {
            req.session.cafeUser = userPayload;

            res.cookie('cafe_session', req.session.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 6 * 60 * 60 * 1000, // 6 hours
                path: '/'
            });

            return req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                return res.status(200).json(req.session.cafeUser);
            });
        }
        else if (platform === 'app') {
            // Create tokens
            const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
            const refreshToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

            // Save tokens
            user.tokens.token = accessToken;
            user.tokens.refresh_token = refreshToken;
            await user.save();

            return res.status(200).json({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
        }
        else {
            return res.status(400).json({ error: "Invalid platform" });
        }

    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register new cafe owner
router.post('/register', [
    body('name').notEmpty(),
    body('username').notEmpty(),
    body('password').notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone(),
    body('universityId').notEmpty(),
    body('campusId').notEmpty(),
    body('cafeName').notEmpty(),
    body('cafeInformation').notEmpty(),
    body('coordinates').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name, username, password, email, phone,
            universityId, campusId,
            cafeName, cafeInformation, coordinates
        } = req.body;

        // Check if either email or phone is provided
        if (!email && !phone) {
            return res.status(400).json({ message: 'Either email or phone is required' });
        }

        // Check for existing user
        const existingUser = await CafeUser.findOne({
            $or: [
                { username: username.toLowerCase() },
                email ? { email: email.toLowerCase() } : { phone }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create cafe first (inactive)
        const cafe = new Cafe({
            name: cafeName,
            information: cafeInformation,
            coordinates,
            status: 'deactive',
            references: {
                universityId,
                campusId
            }
        });
        await cafe.save();

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create cafe user
        const cafeUser = new CafeUser({
            name,
            username: username.toLowerCase(),
            password: hashedPassword,
            email: email?.toLowerCase(),
            phone,
            role: 'c_admin',
            attachedCafe: cafe._id,
            references: {
                universityId,
                campusId
            }
        });
        await cafeUser.save();

        // Update cafe with admin reference
        cafe.attachedCafeAdmin = cafeUser._id;
        await cafe.save();

        res.status(201).json({
            message: 'Registration successful. Please wait for admin approval.',
            cafeId: cafe._id
        });

    } catch (error) {
        console.error("Error in register:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Forgot password
router.post('/forgot-password', [
    body('identifier').notEmpty()
], async (req, res) => {
    try {
        const { identifier } = req.body;

        const user = await CafeUser.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phone: identifier },
                { username: identifier.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.status.activationKey = resetToken;
        await user.save();

        // TODO: Send reset token via email or SMS

        res.status(200).json({ message: 'Reset instructions sent' });

    } catch (error) {
        console.error("Error in forgot-password:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset password
router.post('/reset-password', [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await CafeUser.findOne({
            'status.activationKey': token
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.status.activationKey = null;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });

    } catch (error) {
        console.error("Error in reset-password:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all active cafes
router.get('/', async (req, res) => {
    try {
        const cafes = await Cafe.find({ status: 'active' })
            .populate('attachedCafeAdmin', 'name email phone')
            .select('-tokens');
        res.status(200).json(cafes);
    } catch (error) {
        console.error("Error fetching cafes:", error);
        res.status(500).json({ message: 'Server error' });
    }
});



// ? BELOW THESE ARE FOR STUDENTS | ALUMNI
router.get('/campus/cafe/all', async (req, res) => {
    try {
        const { campusId } = getUserDetails(req);
        console.log(campusId);
        const cafes = await Cafe.find({ 'references.campusId': campusId, status:'active' }).select(' name attachedCafeAdmin status contact accumulatedRating information').populate([
            {
                path: 'attachedCafeAdmin',
                select: 'name email',
            }
        ]);
        console.log(cafes);
        if (!cafes || cafes.length === 0) {
            return res.status(404).json({ message: 'No cafes found for this campus, You can ask your moderator for Cafe creation or could become a moderator of your campus' });
        }
        res.status(200).json(cafes);
    }
    catch (error) {
        console.error("Error fetching cafes:", error);
        res.status(500).json({ message: 'Server error' });
    }
}
);


router.get('/campus/cafe/:cafeId/fooditems', async (req, res) => {
    try {
        
        const { cafeId } = req.params;
        
        const cafes = await Cafe.findOne({_id: cafeId}).select('foodItems').where({ status: 'active'}).populate([{
            path: 'foodItems',
            select: 'name description imageUrl price totalRatings takeAwayPrice takeAwayStatus category bestSelling volume favouritebByUsersCount ratingsMap',
            populate: {
                path: 'category',
                select: 'name slug imageUrl'
            }
        }]);
        if (!cafes || cafes.length === 0) {
            return res.status(404).json({ message: 'No Food Items Yet' });
        }
        console.log(cafes);
        res.status(200).json({fooditems: cafes});
    }
    catch (error) {
        console.error("Error fetching cafes:", error);
        res.status(500).json({ message: 'Server error' });
    }
}
);

router.get('/campus/cafe/fooditems/reviews/:fooditemId', async (req, res) => {
    try {
      const { fooditemId } = req.params;
    //   CafeItemRating
  
      const foodItem = await FoodItem.findOne({ _id: fooditemId }).populate({
        path: 'ratings',
        select: '_id favourited favouritedBy ratingMessage cafeVoteId updatedAt createdAt rating',
        populate: [{
          path: 'cafeVoteId',
          select: 'vote reactions votePlusCount voteMinusCount updatedAt'
        }, {
            path: 'userId',
            select: 'name username',
        }]
      });
  
      if (!foodItem) {
        return res.status(404).json({ message: 'No Ratings Yet' });
      }

      console.log("DATA IN FOOD ITEM", JSON.stringify(foodItem, null, 2));
  
      res.status(200).json(foodItem);
    } catch (error) {
      console.error("Error fetching food item reviews:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

//   router.get('/campus/cafe/fooditems/:fooditemId', async (req, res) => {
//     try {
//       const { fooditemId } = req.params;
//     //   CafeItemRating
  
//       const foodItem = await FoodItem.findOne({ _id: fooditemId }).populate({
        
//       });
  
//       if (!foodItem) {
//         return res.status(404).json({ message: 'No Ratings Yet' });
//       }

//       console.log("DATA IN FOOD ITEM", JSON.stringify(foodItem, null, 2));
  
//       res.status(200).json(foodItem);
//     } catch (error) {
//       console.error("Error fetching food item reviews:", error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   });
  


router.post('/fooditem/rate', async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { foodItemId, cafeId, ratingMessage, rating } = req.body;
        const { userId, campusId, universityId } = getUserDetails(req);

        console.log("ALL DATA", req.body, userId, campusId, universityId);

        await session.withTransaction(async () => {
            const fooditem = await FoodItem.findById(foodItemId).session(session);
            if (!fooditem) {
                res.status(404).json({ message: 'Food item not found' });
            }

            // Check if the user already rated
            let ratingDoc = await CafeItemRating.findOne({ foodItemId, userId }).session(session);
console.log("RATING DOC", ratingDoc);
            if (ratingDoc) {
                // Update existing rating
                ratingDoc.ratingMessage = ratingMessage;
                ratingDoc.rating = rating;
                ratingDoc.isEdited = true;
                await ratingDoc.save({ session });

                // Recalculate average using aggregation
                const updated = await CafeItemRating.aggregate([
                    { $match: { foodItemId: new mongoose.Types.ObjectId(foodItemId) } },
                    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } }
                ]);

                const avgRating = updated[0]?.avgRating || 0;
                const totalRatings = updated[0]?.totalRatings || 0;
                fooditem.totalRatings = avgRating.toFixed(2);
                fooditem.ratingCount = totalRatings; // Optional: you can also store the total number of ratings
                await fooditem.save({ session });

                return res.status(200).json({
                    message: 'Rating updated successfully',
                    rating: ratingDoc // Return updated rating
                });

            } else {
                // Create new rating
                ratingDoc = new CafeItemRating({
                    foodItemId,
                    cafeId,
                    userId,
                    ratingMessage,
                    rating,
                    references: {
                        campusId: universityId,
                        universityId: campusId
                    }
                });

                await ratingDoc.save({ session });

                const voteDoc = new CafeVote({
                    _id: ratingDoc._id,
                    attachedCafe: cafeId,
                    references: {
                        campusId: universityId,
                        universityId: campusId
                    }
                });

                await voteDoc.save({ session });

                ratingDoc.cafeVoteId = voteDoc._id;
                await ratingDoc.save({ session });

                fooditem.ratings.push(ratingDoc._id);
                await fooditem.save({ session });

                // Recalculate average using aggregation
                const updated = await CafeItemRating.aggregate([
                    { $match: { foodItemId: new mongoose.Types.ObjectId(foodItemId) } },
                    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } }
                ]);

                const avgRating = updated[0]?.avgRating || 0;
                const totalRatings = updated[0]?.totalRatings || 0;
                fooditem.totalRatings = avgRating.toFixed(2);
                fooditem.ratingCount = totalRatings; // Optional: store total count of ratings
                await fooditem.save({ session });

                return res.status(201).json({
                    message: 'Rating added successfully',
                    rating: ratingDoc // Return the newly created rating
                });
            }
        });

        session.endSession();
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in rating food item:", error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});


// router.post('/fooditem/rate', async (req, res) => {
//     const session = await mongoose.startSession();
//     try {
//         const { foodItemId, cafeId, ratingMessage, rating } = req.body;
//         const { userId, campusId, universityId } = getUserDetails(req);

//         console.log("ALL DATA", req.body, userId, campusId, universityId);

//         await session.withTransaction(async () => {
//             const fooditem = await FoodItem.findById(foodItemId).session(session);
//             if (!fooditem) {
//                 throw new Error('Food item not found');
//             }

//             // Check if the user already rated
//             let ratingDoc = await CafeItemRating.findOne({ foodItemId, userId }).session(session);

//             if (ratingDoc) {
//                 // Update existing rating
//                 ratingDoc.ratingMessage = ratingMessage;
//                 ratingDoc.rating = rating;
//                 ratingDoc.isEdited = true;
//                 await ratingDoc.save({ session });

//                 // Recalculate average using aggregation
//                 const updated = await CafeItemRating.aggregate([
//                     { $match: { foodItemId: new mongoose.Types.ObjectId(foodItemId) } },
//                     { $group: { _id: null, avgRating: { $avg: "$rating" } } }
//                 ]);

//                 const avgRating = updated[0]?.avgRating || 0;
//                 fooditem.totalRatings = avgRating.toFixed(2);
//                 await fooditem.save({ session });

//                 return res.status(200).json({
//                     message: 'Rating updated successfully',
//                     rating: ratingDoc
//                 });
//             }else{

            

//             // Create new rating
//             ratingDoc = new CafeItemRating({
//                 foodItemId,
//                 cafeId,
//                 userId,
//                 ratingMessage,
//                 rating,
//                 references: {
//                     campusId: universityId,
//                     universityId: campusId
//                 }
//             });

//             await ratingDoc.save({ session });

//             const voteDoc = new CafeVote({
//                 _id: ratingDoc._id,
//                 attachedCafe: cafeId,
//                 references: {
//                     campusId: universityId,
//                     universityId: campusId
//                 }
//             });

//             await voteDoc.save({ session });

//             ratingDoc.cafeVoteId = voteDoc._id;
//             await ratingDoc.save({ session });

//             fooditem.ratings.push(ratingDoc._id);
//             await fooditem.save({ session });

//             // Recalculate average
//             const updated = await CafeItemRating.aggregate([
//                 { $match: { foodItemId: new mongoose.Types.ObjectId(foodItemId) } },
//                 { $group: { _id: null, avgRating: { $avg: "$rating" } } }
//             ]);

//             const avgRating = updated[0]?.avgRating || 0;
//             fooditem.totalRatings = avgRating.toFixed(2);
//             await fooditem.save({ session });
//         }
//         });

//         session.endSession();
//         return res.status(201).json({
//             message: 'Rating added successfully',
//             rating: 'Success' // If you want the actual doc, re-fetch it outside session
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         console.error("Error in rating food item:", error);
//         res.status(500).json({ message: error.message || 'Server error' });
//     }
// });




// router.post('/fooditem/rate', async (req, res) => {
//     try {
//         const { foodItemId, cafeId, ratingMessage, rating } = req.body;
//         const { userId , campusId, universityId} = getUserDetails(req);

//         const fooditem = await FoodItem.findById(foodItemId);
//         if (!fooditem) {
//             return res.status(404).json({ message: 'Food item not found' });
//         }
//         const ratingExistsThenUpdate = await CafeItemRating.findOne({ foodItemId, userId });
//         if (ratingExistsThenUpdate) {
//             ratingExistsThenUpdate.ratingMessage = ratingMessage;
//             ratingExistsThenUpdate.rating = rating;
//             ratingExistsThenUpdate.isEdited = true;
//             await ratingExistsThenUpdate.save();
//             return res.status(200).json({
//                 message: 'Rating updated successfully',
//                 rating: ratingExistsThenUpdate
//             });
//         }
//         const createdRating = new CafeItemRating({
//             foodItemId,
//             cafeId,
//             userId,
//             ratingMessage,
//             rating: rating,
//             'references.campusId':universityId,
//             'references.universityId':campusId ,
//         });

//         await createdRating.save();

//         const voteId = new CafeVote({
//             _id: createdRating._id,
//             attachedCafe: cafeId,
//             'references.campusId':universityId,
// 'references.universityId':campusId ,
//         })
//         voteId.save();
//         createdRating.cafeVoteId = voteId._id;
//         await createdRating.save();

//         fooditem.ratings.push(createdRating._id);
//         fooditem.save();

//        const newRating = ((fooditem.totalRatings + rating) / fooditem.ratings.length-1).toFixed(2);
//        fooditem.totalRatings = newRating;
//        fooditem.save();

        

//         return res.status(201).json({
//             message: 'Rating added successfully',
//             rating: createdRating
//         });

        
//     } catch (error) {
//         console.error("Error in rating food item:", error);
//         res.status(500).json({ message: 'Server error' });
//     }
// })

module.exports = router;
