const Society = require('../../models/society/society.model');

const router = require('express').Router();
const mongoose= require('mongoose');

const Members = require('../../models/society/members.collec.model');
const SocietyType = require('../../models/society/society.type.model');
const VerificationRequest = require('../../models/verification/verfication.model');

router.get('/', async (req,res)=>{
    try{
        const {campusId} = req.query;

        if(!campusId) {
            return res.status(404).json({error: "Campus ID is required"})
        }

        const societies = await Society.find({'references.campusOrigin': campusId})

        if(!societies){
            return res.status(200).json({societies: []});
        }
        return res.status(200).json({societies: societies});
    }catch(e){
        console.error("error in super/societies GET")
        return res.status(500).json({message: "Internal Server Error"})
    }
});


router.get('/paginated/', async (req, res) => {
  try {
    const { campusId, page = 1, limit = 10 } = req.query;

    if (!campusId) {
      return res.status(404).json({ error: "Campus ID is required" });
    }

    const query = { 'references.campusOrigin': campusId };

    const totalSocieties = await Society.countDocuments(query);

    const societies = await Society.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      societies,
      pagination: {
        total: totalSocieties,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalSocieties / limit),
        hasNextPage: page * limit < totalSocieties,
        hasPrevPage: page > 1
      }
    });
  } catch (e) {
    console.error("error in super/societies GET:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get('/search', async (req, res) => {
  try {
    const { campusId, search = '' } = req.query;

    const query = {
      name: { $regex: search, $options: 'i' }, // case-insensitive partial match
    };

    if (campusId) {
      query['references.campusOrigin'] = campusId;
    }

    const societies = await Society.find(query).limit(50); // default 50 max, for safety

    return res.status(200).json({
      societies,
      total: societies.length,
    });
  } catch (error) {
    console.error('Error in society search route:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.put("/society/hide/:id", async (req, res) => {
  
  try {
    const { id } = req.params;
  const {reason} = req.body;
    const society = await Society.findByIdAndUpdate({ _id: id }, {hiddenBySuper: true, reason})

    if (!society) return res.status(404).json("no society found")
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});


router.get('/filter', async (req, res) => {
  try {
    const {
      campusId = undefined,
      status = 'all',        // 'all', 'active', 'hidden', 'deleted'
      visibility = 'all',    // 'all', 'public', 'private'
      restriction = 'all',   // 'all', 'restricted', 'unrestricted'
      verified = 'all'       // 'all', 'verified', 'unverified'
    } = req.query;

    const query = {};

    // 🏫 Match Campus (optional)
    if (campusId && mongoose.Types.ObjectId.isValid(campusId)) {
      query['references.campusOrigin'] = campusId;
    }

    // ✅ Status
    if (status === 'active') {
      query.isDeleted = false;
      query.hiddenByMod = false;
      query.hiddenBySuper = false;
    } else if (status === 'deleted') {
      query.isDeleted = true;
    } else if (status === 'hidden') {
      query.$or = [
        { hiddenByMod: true },
        { hiddenBySuper: true }
      ];
    }

    // 👀 Visibility
    if (visibility === 'public') {
      query.visibilityNone = false;
    } else if (visibility === 'private') {
      query.visibilityNone = true;
    }

    // 🔒 Restriction (based on `allows` field)
    if (restriction === 'restricted') {
      query.allows = { $ne: 'all' };
    } else if (restriction === 'unrestricted') {
      query.allows = 'all';
    }

    // ☑️ Verified
    if (verified === 'verified') {
      query.verified = true;
    } else if (verified === 'unverified') {
      query.verified = false;
    }

    const societies = await Society.find(query).limit(100); // optional: add pagination later

    return res.status(200).json({
      societies,
      total: societies.length,
    });
  } catch (error) {
    console.error('Error in /filter route:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

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
// ✅ GET All Types
router.get("/types", async (req, res) => {
  try {
    const types = await SocietyType.find();
    res.status(200).json({ types });
  } catch (error) {
    console.error("Error fetching types:", error);
    res.status(500).json("Internal Server Error");
  }
});

// ✅ GET Type by ID
router.get("/types/:id", async (req, res) => {
  try {
    const type = await SocietyType.findById(req.params.id);
    if (!type) return res.status(404).json({ error: "Type not found" });
    res.status(200).json({ type });
  } catch (error) {
    console.error("Error fetching type by ID:", error);
    res.status(500).json("Internal Server Error");
  }
});

// ✅ PUT / Update a Type
router.put("/types/:id", async (req, res) => {
  try {
    const { type, totalCount } = req.body;

    const updated = await SocietyType.findByIdAndUpdate(
      req.params.id,
      { societyType: type, totalCount },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "Type not found" });

    res.status(200).json({ message: "Type updated", updated });
  } catch (error) {
    console.error("Error updating type:", error);
    res.status(500).json("Internal Server Error");
  }
});

// ✅ DELETE a Type
router.delete("/types/:id", async (req, res) => {
  try {
    const deleted = await SocietyType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Type not found" });

    res.status(200).json({ message: "Type deleted", deleted });
  } catch (error) {
    console.error("Error deleting type:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.get('/society/members', async (req, res) => {
  try {
    const { societyId, page = 1, limit = 20 } = req.query;

    // 🔐 Validation
    if (!societyId || !mongoose.Types.ObjectId.isValid(societyId)) {
      return res.status(400).json({ message: 'Invalid or missing societyId' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const societyMembersDoc = await Members.findOne({ societyId })
      .populate({
        path: 'members',
        select: 'name universityEmail personalEmail',
        options: {
          skip,
          limit: parseInt(limit),
        },
      });
      console.log("societyMembersDoc", societyMembersDoc)

    if (!societyMembersDoc) {
      return res.status(404).json({ message: 'Society members not found' });
    }

    const totalMembers = societyMembersDoc.members.length;
    console.log("totalMembers", totalMembers)
    console.log("MEMBERs", societyMembersDoc.members)

    return res.status(200).json({
      members: societyMembersDoc.members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalMembers,
        totalPages: Math.ceil(totalMembers / limit),
        hasNextPage: skip + parseInt(limit) < totalMembers,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error in /society/members:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});



router.get('/society/search', async (req, res) => {
  try {
    const { memberName = '', societyId } = req.query;

    if (!societyId || !mongoose.Types.ObjectId.isValid(societyId)) {
      return res.status(400).json({ message: 'Valid societyId is required.' });
    }

    // Fetch the Members document for this society
    const membersDoc = await Members.findOne({ societyId })
      .populate({
        path: 'members',
        match: {
          name: { $regex: memberName, $options: 'i' } // case-insensitive search
        },
        select: 'name universityEmail personalEmail'
      });

    if (!membersDoc) {
      return res.status(404).json({ message: 'Society members not found.' });
    }

    return res.status(200).json({
      members: membersDoc.members || [],
      total: (membersDoc.members || []).length
    });

  } catch (error) {
    console.error('Error searching members by name:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ===============================
// VERIFICATION REQUEST ROUTES
// ===============================

/**
 * GET all verification requests with pagination and filtering
 */
router.get('/verification-requests', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      priority = 'all',
      type = 'all',
      search = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (priority !== 'all') {
      query.priority = priority;
    }
    
    if (type === 'society') {
      query.society = { $exists: true };
    } else if (type === 'alumni') {
      query.alumni = { $exists: true };
    }

    // Add search functionality
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { comments: { $regex: search, $options: 'i' } },
          { 'adminReview.reviewNotes': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const finalQuery = { ...query, ...searchQuery };

    const total = await VerificationRequest.countDocuments(finalQuery);
    
    const requests = await VerificationRequest.find(finalQuery)
      .populate({
        path: 'society',
        select: 'name description icon banner totalMembers verified',
        populate: {
          path: 'references.campusOrigin references.universityOrigin',
          select: 'name location'
        }
      })
      .populate('requestedBy', 'name universityEmail personalEmail profile')
      .populate('assignedCampusModerator', 'name universityEmail')
      .populate('approvedBySuper', 'name universityEmail')
      .populate('rejectedBySuper', 'name universityEmail')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: page > 1
      },
      stats: {
        pending: await VerificationRequest.countDocuments({ status: 'pending' }),
        underReview: await VerificationRequest.countDocuments({ status: 'under_review' }),
        approved: await VerificationRequest.countDocuments({ status: 'approved' }),
        rejected: await VerificationRequest.countDocuments({ status: 'rejected' })
      }
    });

  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET single verification request by ID
 */
router.get('/verification-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = await VerificationRequest.findById(id)
      .populate({
        path: 'society',
        select: 'name description icon banner totalMembers verified moderators creator',
        populate: [
          {
            path: 'references.campusOrigin references.universityOrigin',
            select: 'name location'
          },
          {
            path: 'moderators creator',
            select: 'name universityEmail personalEmail profile'
          }
        ]
      })
      .populate('requestedBy', 'name universityEmail personalEmail profile')
      .populate('assignedCampusModerator', 'name universityEmail profile')
      .populate('approvedBySuper', 'name universityEmail')
      .populate('rejectedBySuper', 'name universityEmail');

    if (!request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    return res.status(200).json({ request });

  } catch (error) {
    console.error('Error fetching verification request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT approve verification request
 */
router.put('/verification-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    // Assuming admin user ID is available in req.user or similar
    const adminUserId = req.user?.id || req.session?.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const request = await VerificationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Request already approved' });
    }

    // Update verification request
    const updatedRequest = await VerificationRequest.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBySuper: adminUserId,
        'adminReview.reviewedAt': new Date(),
        'adminReview.reviewNotes': reviewNotes || '',
        lastUpdated: new Date()
      },
      { new: true }
    ).populate('society', 'name _id');

    // Update society verification status
    if (updatedRequest.society) {
      await Society.findByIdAndUpdate(
        updatedRequest.society._id,
        { verified: true },
        { new: true }
      );
    }

    // Populate the response
    const populatedRequest = await VerificationRequest.findById(id)
      .populate('society', 'name description icon banner verified')
      .populate('requestedBy', 'name universityEmail')
      .populate('approvedBySuper', 'name universityEmail');

    return res.status(200).json({
      message: 'Verification request approved successfully',
      request: populatedRequest
    });

  } catch (error) {
    console.error('Error approving verification request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT reject verification request
 */
router.put('/verification-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, reviewNotes } = req.body;
    // Assuming admin user ID is available in req.user or similar
    const adminUserId = req.user?.id || req.session?.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const request = await VerificationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (request.status === 'rejected') {
      return res.status(400).json({ error: 'Request already rejected' });
    }

    // Update verification request
    const updatedRequest = await VerificationRequest.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectedBySuper: adminUserId,
        'adminReview.reviewedAt': new Date(),
        'adminReview.reviewNotes': reviewNotes || '',
        'adminReview.rejectionReason': rejectionReason,
        lastUpdated: new Date()
      },
      { new: true }
    );

    // Populate the response
    const populatedRequest = await VerificationRequest.findById(id)
      .populate('society', 'name description icon banner verified')
      .populate('requestedBy', 'name universityEmail')
      .populate('rejectedBySuper', 'name universityEmail');

    return res.status(200).json({
      message: 'Verification request rejected',
      request: populatedRequest
    });

  } catch (error) {
    console.error('Error rejecting verification request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT update verification request status to under review
 */
router.put('/verification-requests/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const updatedRequest = await VerificationRequest.findByIdAndUpdate(
      id,
      {
        status: 'under_review',
        'adminReview.reviewNotes': reviewNotes || '',
        lastUpdated: new Date()
      },
      { new: true }
    ).populate('society', 'name description icon banner')
      .populate('requestedBy', 'name universityEmail');

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    return res.status(200).json({
      message: 'Verification request marked as under review',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Error updating verification request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT update verification request priority
 */
router.put('/verification-requests/:id/priority', async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const updatedRequest = await VerificationRequest.findByIdAndUpdate(
      id,
      { priority, lastUpdated: new Date() },
      { new: true }
    ).populate('society', 'name description')
      .populate('requestedBy', 'name universityEmail');

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    return res.status(200).json({
      message: 'Priority updated successfully',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Error updating priority:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE verification request (admin only)
 */
router.delete('/verification-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const deletedRequest = await VerificationRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    return res.status(200).json({
      message: 'Verification request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting verification request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;