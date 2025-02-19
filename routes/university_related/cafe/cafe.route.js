const express = require('express');
const router = express.Router();



const cafeProtectedRoutes = require('./protected/cafe.protected.routes');
const cafeProtect = require('../../../middlewares/cafe.protect');


router.use('/user', cafeProtect, cafeProtectedRoutes)

router.post('/login', async (req, res) => {
    try {
        console.log("Inside login")
    } catch (error) {
        console.error("ERROR login")
    }
})



router.get('/', async (req, res) => {
    try {
        console.log("Inside /")
    } catch (error) {
        console.error("ERROR /")
    }
})



module.exports = router;
