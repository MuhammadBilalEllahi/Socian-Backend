const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const CafeUser = require('../../../models/cafes_campus/cafe.user.model');
const Cafe = require('../../../models/cafes_campus/cafe.model');
const cafeProtectedRoutes = require('./protected/cafe.protected.routes');
const cafeProtect = require('../../../middlewares/cafe.protect');

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

module.exports = router;
