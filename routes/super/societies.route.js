const Society = require('../../models/society/society.model');

const router = require('express').Router();
const mongoose= require('mongoose');

const Members = require('../../models/society/members.collec.model')

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


module.exports = router;