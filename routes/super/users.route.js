const User = require('../../models/user/user.model');
const { getUserDetails } = require('../../utils/utils');

const router = require('express').Router();

router.put('/user/ban', async(req,res)=>{
    try{
        const {userId} = getUserDetails(req)
        const {userUID} = req.query;

        const userExistsAndBanned = await User.findByIdAndUpdate(userUID, {
            restrictions: {
                blocking: {
                  isBlocked: true,
                  reason: reason,
                  blockedBy: userId,
                }
            }
        });
    }catch(e){

    }
})
module.exports = router;