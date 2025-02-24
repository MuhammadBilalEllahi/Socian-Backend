const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { getUserDetails } = require('../../../utils/utils');
const FoodCategory = require('../../../models/cafes_campus/category.food.item.model');
const FoodItem = require('../../../models/cafes_campus/food.item.model');
const Cafe = require('../../../models/cafes_campus/cafe.model');
const CafeUser = require('../../../models/cafes_campus/cafe.user.model');
const moment = require('moment')

// Cafe admin might be able to read and write. translate the reviews to them. or Speak the revies. Or just make app view in URDU

// Middleware for validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.get('/admins', async (req, res) => {
    try {
        const { role, campusOrigin, universityOrigin } = getUserDetails(req);
        const admins = await CafeUser.find({
            'references.universityId': universityOrigin,
            'references.campusId': campusOrigin
        });
        console.log("HERE", admins)

        if (!admins) return res.status(204).json({ message: 'No Cafe Admins Yet', admins: [] })
        res.status(200).json({ admins: admins })
    } catch (error) {
        console.error("error in /api/mod/cafe/admins", error)
        res.status(500).json({ error: error.message });

    }
})



router.post('/create/admin', async (req, res) => {
    try {
        const { userId, campusOrigin, universityOrigin } = getUserDetails(req);
        const { adminName,
            adminUsername,
            adminEmail,
            adminPhone,
            adminPassword,
            toAttachedCafeId } = req.body;

        const cafeExists = await Cafe.findById(toAttachedCafeId)
        if (!cafeExists) return res.status(204).json({ message: "This Cafe does not Exists" });

        const adminCreated = await CafeUser.create({
            name: adminName,
            username: adminUsername,
            email: adminEmail,
            phone: adminPhone,
            password: adminPassword,
            role: 'c_admin',
            attachedCafe: toAttachedCafeId,
            'createdBy.user': userId,
            'references.universityId': universityOrigin,
            'references.campusId': campusOrigin
        });
        console.log("HERE", adminCreated)

        if (!adminCreated) return res.status(204).json({ message: 'Cafe Admins Could Not Be Created', newAdmin: [] })
        res.status(200).json({ newAdmin: adminCreated })
    } catch (error) {
        console.error("error in /api/mod/cafe/admins", error)
        res.status(500).json({ error: error.message });

    }
})

router.post('/create/employee', async (req, res) => {
    try {
        const { userId, campusOrigin, universityOrigin } = getUserDetails(req);

        const { employeeName,
            employeeUsername,
            employeeEmail,
            employeePhone,
            employeePassword,
            toAttachedCafeId } = req.body;

        const doesAdminExists = await Cafe.findOne({
            _id: toAttachedCafeId,
            attachedCafeAdmin: { $exists: true }
        })
        if (!doesAdminExists) return res.status(204).json({ message: "The Cafe to which you are adding an employee does not have an admin yet. Please Add an admin to create an Employee" })
        const employeeCreated = await CafeUser.create({
            name: employeeName,
            username: employeeUsername,
            email: employeeEmail,
            phone: employeePhone,
            password: employeePassword,
            role: 'c_employee',
            attachedCafe: toAttachedCafeId,
            'createdBy.user': userId,
            'references.universityId': universityOrigin,
            'references.campusId': campusOrigin
        });
        console.log("HERE", employeeCreated)

        if (!employeeCreated) return res.status(204).json({ message: 'Cafe Admins Could Not Be Created', newEmployee: [] })
        res.status(200).json({ newEmployee: employeeCreated })
    } catch (error) {
        console.error("error in /api/mod/cafe/employee", error)
        res.status(500).json({ error: error.message });

    }
})



// @route   POST /api/cafes/create
// @desc    Create a new cafe
// @access  Private
router.post('/create',
    [
        body('name').notEmpty().withMessage('Cafe name is required'),
        body('contact').optional().isString().withMessage("Contact is required"),
        body('information').isString().withMessage("Information is required"),
        // body('status').isIn(['active', 'deactive', 'archived', 'deleted']),
        // body('attachedCafeAdmin').notEmpty().withMessage('Cafe admin is required'),
        body('coordinates.latitude').exists().withMessage('Latitude must be a number'),
        body('coordinates.longitude').exists().withMessage('Longitude must be a number'),
        body('coordinates.locationInText').optional().isString(),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, attachedCafeAdmin, contact, information, coordinates } = req.body;
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);

            console.log("\n", userId, universityOrigin, campusOrigin)
            console.log("\n", name, attachedCafeAdmin, contact, information, coordinates);

            let status = 'deactive';
            if (attachedCafeAdmin) status = 'active';

            const toFill = {
                name,
                status: status,
                contact: contact || '',
                information: information || '',
                coordinates: {
                    // _id: undefined,
                    latitude: coordinates?.latitude || 0,
                    longitude: coordinates?.longitude || 0,
                    locationInText: coordinates?.locationInText || ''
                },
                createdBy: { user: userId },
                references: {
                    universityId: universityOrigin,
                    campusId: campusOrigin
                }
            };
            if (attachedCafeAdmin) { toFill.attachedCafeAdmin = attachedCafeAdmin; }

            const newCafe = new Cafe(toFill);

            await newCafe.save();
            res.status(201).json({ message: 'Cafe created successfully', cafe: newCafe });

        } catch (error) {
            console.error("Error creating Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);




router.get('/deletes',
    async (req, res) => {
        try {
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);

            let cafes = await Cafe.find({
                'references.campusId': campusOrigin, deleted: true
            })
                .populate([
                    { path: 'createdBy.user' },
                    {
                        path: 'lastChangesBy',
                        populate: 'userId',

                    }]
                )
                .sort({ createdAt: -1 })
                .lean();
            // console.log("DATA", cafes)


            if (!cafes || cafes.length === 0) return res.status(204).json({ message: 'No Cafes Yet' });

            cafes = cafes.map(cafe => ({
                ...cafe,
                createdAt: moment(cafe.createdAt).format('MMMM Do YYYY, h:mm:ss a'), // Example: "February 22nd 2025, 2:45:12 pm"
                updatedAt: cafe.updatedAt ? moment(cafe.updatedAt).format('MMMM Do YYYY, h:mm:ss a') : null,
                user: {
                    _id: cafe.createdBy.user._id,
                    name: cafe.createdBy.user.name,
                    super_role: cafe.createdBy.user.super_role
                }
            }));
            res.status(201).json({ message: 'Cafe created successfully', cafes: cafes });

        } catch (error) {
            console.error("Error getting Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);

router.put('/update/:cafeId/all', async (req, res) => {
    try {
        const { name, attachedCafeAdmin, contact, information, coordinates, status } = req.body;
        const { cafeId } = req.params;
        const { userId, campusOrigin } = getUserDetails(req);

        let fields = ''
        const updateData = {};




        if (name) {
            updateData.name = name
            fields += `, name: ${name}`;
        };
        if (attachedCafeAdmin) {
            updateData.attachedCafeAdmin = attachedCafeAdmin
            fields += `, attachedCafeAdmin: ${attachedCafeAdmin}`;
        };
        if (contact) {
            updateData.contact = contact
            fields += `, contact: ${contact}`;
        };
        if (information) {
            updateData.information = information
            fields += `, information: ${information}`;
        };
        if (coordinates) {
            updateData.coordinates = coordinates
            fields += `, coordinates: ${coordinates}`;
        };
        if (status) {
            updateData.status = status
            fields += `, status: ${status}`;
        };



        const updatedCafe = await Cafe.findOneAndUpdate({ _id: cafeId, 'references.campusId': campusOrigin }, {
            $set: updateData,
            $push: {
                lastChangesBy: {
                    whatUpdated: `${fields}`,
                    cafeId,
                    userId: userId,
                    userType: 'User',
                    updatedAt: new Date()
                }
            }

        }, { new: true });

        updatedCafe.updatedAt = moment(updatedCafe.updatedAt).format('MMMM Do YYYY, h:mm:ss a')

        if (!updatedCafe) return res.status(404).json({ message: "Cafe not found" });

        if (updatedCafe.references.campusId !== campusOrigin) {
            console.warn(`Unauthorized attempt to update cafe outside of campus`);
        }

        res.json({ message: `Cafe ${fields} updated successfully`, cafe: updatedCafe });
    } catch (error) {
        console.error(`Error updating cafe ${fields}:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
);




router.get('/all',
    async (req, res) => {
        try {
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);

            let cafes = await Cafe.find({
                'references.campusId': campusOrigin, deleted: false
            }).populate([{ path: 'createdBy.user' },
            {
                path: 'lastChangesBy',
                populate: 'userId',

            }]
            )
                .sort({ createdAt: -1 })
                .lean();


            if (!cafes || cafes.length === 0) return res.status(204).json({ message: 'No Cafes Yet' });

            cafes = cafes.map(cafe => ({
                ...cafe,
                createdAt: moment(cafe.createdAt).format('MMMM Do YYYY, h:mm:ss a'), // Example: "February 22nd 2025, 2:45:12 pm"
                updatedAt: cafe.updatedAt ? moment(cafe.updatedAt).format('MMMM Do YYYY, h:mm:ss a') : null,
                user: {
                    _id: cafe.createdBy.user._id,
                    name: cafe.createdBy.user.name,
                    super_role: cafe.createdBy.user.super_role
                }
            }));
            res.status(201).json({ message: 'Cafe created successfully', cafes: cafes });

        } catch (error) {
            console.error("Error getting Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);




router.get('/:cafeId',
    async (req, res) => {
        try {
            const { cafeId } = req.params;
            if (!cafeId) return res.status(404).json({ message: "No Cafe Id Found" })
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);

            let cafe = await Cafe.findOne({
                _id: cafeId, 'references.campusId': campusOrigin
            }).populate([{ path: 'createdBy.user' },
            {
                path: 'lastChangesBy',
                populate: 'userId',

            }]
            )
                .sort({ createdAt: -1 })
                .lean();


            if (!cafe) return res.status(204).json({ message: 'No Cafe With Such Id' });

            cafe.createdAt = moment(cafe.createdAt).format('MMMM Do YYYY, h:mm:ss a'), // Example: "February 22nd 2025, 2:45:12 pm"
                cafe.updatedAt = cafe.updatedAt ? moment(cafe.updatedAt).format('MMMM Do YYYY, h:mm:ss a') : null,


                res.status(201).json({ message: 'Cafe Found', cafe: cafe });

        } catch (error) {
            console.error("Error getting Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);







router.delete('/:cafeId/delete',
    async (req, res) => {
        try {
            const { cafeId } = req.params;
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);
            field = "deleted"

            let cafes = await Cafe.findByIdAndUpdate(cafeId, {
                deleted: true,
                status: 'deactive',
                $push: {
                    lastChangesBy: {
                        whatUpdated: `${field}`,
                        cafeId,
                        userId: userId,
                        userType: 'User',
                        updatedAt: new Date()
                    }
                }

            })

            res.status(201).json({ message: 'Cafe deleted' });

        } catch (error) {
            console.error("Error getting Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);


router.put('/:cafeId/undelete',
    async (req, res) => {
        try {
            const { cafeId } = req.params;
            const { userId, universityOrigin, campusOrigin } = getUserDetails(req);
            field = "undeleted"

            let cafes = await Cafe.findByIdAndUpdate(cafeId, {
                deleted: false,
                $push: {
                    lastChangesBy: {
                        whatUpdated: `${field}`,
                        cafeId,
                        userId: userId,
                        userType: 'User',
                        updatedAt: new Date()
                    }
                }

            })

            res.status(201).json({ message: 'Cafe deleted' });

        } catch (error) {
            console.error("Error getting Cafe:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);

// Generic Update Handler
const updateCafeField = (field) => async (req, res) => {
    const { cafeId } = req.params;
    const updateData = {};
    updateData[field] = req.body[field];

    try {
        const { userId, campusOrigin } = getUserDetails(req);
        const updatedCafe = await Cafe.findByIdAndUpdate(cafeId, {
            $set: updateData,
            $push: {
                lastChangesBy: {
                    whatUpdated: `${field}`,
                    cafeId,
                    userId: userId,
                    userType: 'User',
                    updatedAt: new Date()
                }
            }

        }, { new: true });

        updatedCafe.updatedAt = moment(updatedCafe.updatedAt).format('MMMM Do YYYY, h:mm:ss a')

        if (!updatedCafe) return res.status(404).json({ message: "Cafe not found" });
        if (updatedCafe.references.campusId !== campusOrigin) {
            console.warn(`Unauthorized attempt to update cafe outside of campus`);
        }

        res.json({ message: `Cafe ${field} updated successfully`, cafe: updatedCafe });
    } catch (error) {
        console.error(`Error updating cafe ${field}:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Update Routes
router.patch('/update/:cafeId/name', body('name').notEmpty(), handleValidationErrors, updateCafeField('name'));
router.patch('/update/:cafeId/contact', body('contact').optional().isString(), handleValidationErrors, updateCafeField('contact'));
router.patch('/update/:cafeId/information', body('information').optional().isString(), handleValidationErrors, updateCafeField('information'));
router.patch('/update/:cafeId/status', body('status').isIn(['active', 'deactive', 'archived', 'deleted']), handleValidationErrors, updateCafeField('status'));


// Update Coordinates Route
router.patch('/update/:cafeId/coordinates',
    [
        body('latitude').isNumeric().withMessage('Latitude must be a number'),
        body('longitude').isNumeric().withMessage('Longitude must be a number'),
        body('locationInText').optional().isString(),
    ],
    handleValidationErrors,
    async (req, res) => {
        const { cafeId } = req.params;
        const { latitude, longitude, locationInText } = req.body;


        try {
            const { userId, campusOrigin } = getUserDetails(req);
            const updatedCafe = await Cafe.findByIdAndUpdate(
                cafeId,
                {
                    $set:
                        { 'coordinates.latitude': latitude, 'coordinates.longitude': longitude, 'coordinates.locationInText': locationInText },
                    $push: {
                        lastChangesBy: {
                            whatUpdated: `Coordinates`,
                            cafeId,
                            userId: userId,
                            userType: 'User',
                            updatedAt: new Date()
                        }
                    }
                },
                { new: true }
            );

            if (!updatedCafe) return res.status(404).json({ message: "Cafe not found" });
            if (updatedCafe.references.campusId !== campusOrigin) {
                console.warn(`Unauthorized attempt to update cafe coordinates outside of campus`);
            }

            res.json({ message: 'Cafe coordinates updated successfully', cafe: updatedCafe });

        } catch (error) {
            console.error("Error updating cafe coordinates:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);











/**
 * @route POST /:cafeId/categories
 * @desc Create a new food category inside a specific cafe
 */
router.post('/:cafeId/category', async (req, res) => {
    try {
        const { name, description, imageUrl } = req.body;
        const cafeId = req.params.cafeId;
        const { userId, campusOrigin, universityOrigin } = getUserDetails(req);


        const newCategory = new FoodCategory({
            name,
            description,
            imageUrl: imageUrl || '',
            cafeId: cafeId,
            categoryAddedBy: userId,
            categoryAddedByModel: 'User',
            references: {
                universityId: universityOrigin,
                campusId: campusOrigin,
            },
        });

        const cafe = await Cafe.findByIdAndUpdate(cafeId, {
            $addToSet: {
                categories: newCategory._id
            },
            $push: {
                lastChangesBy: {
                    whatUpdated: `Category-${newCategory._id}`,
                    cafeId,
                    userId: userId,
                    userType: 'User',
                    updatedAt: new Date()
                }
            }
        })

        await newCategory.save();
        res.status(201).json({ category: newCategory });
    } catch (error) {
        console.error("ERROR IN CREATIN G CATEGORY", error)
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /:cafeId/categories
 * @desc Get all food categories in a specific cafe
 */
router.get('/:cafeId/categories', async (req, res) => {
    try {
        const cafeId = req.params.cafeId;
        const categories = await FoodCategory.find({ cafeId: cafeId, deleted: false })
            .populate([{ path: 'categoryAddedBy' },
                , { path: 'itemsInIt', model: 'FoodItem' }
                , { path: 'lastChangesBy.userId' }])

        res.status(200).json({ categories: categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /:cafeId/categories/:categoryId
 * @desc Update a food category
 */
router.put('/update/:cafeId/categories/:categoryId', async (req, res) => {
    try {
        const { cafeId, categoryId } = req.params;
        const updateData = {};

        if (req.body.name) updateData.name = req.body.name;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            {
                updateData,

                $push: {
                    lastChangesBy: {
                        whatUpdated: updateData,
                        cafeId: cafeId,
                        foodCategoryId: categoryId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ message: 'Category updated successfully', category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/update/:cafeId/categories/:categoryId/name', async (req, res) => {
    try {
        const { name } = req.body;
        const { cafeId, categoryId } = req.params;

        const { userId } = getUserDetails(req)

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            {
                name,
                $push: {
                    lastChangesBy: {
                        whatUpdated: 'name',
                        cafeId: cafeId,
                        foodCategoryId: categoryId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ category: category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/update/:cafeId/categories/:categoryId/description', async (req, res) => {
    try {
        const { description } = req.body;
        const { cafeId, categoryId } = req.params;
        const { userId } = getUserDetails(req)

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            {
                description,
                $push: {
                    lastChangesBy: {
                        whatUpdated: `description-${description}`,
                        cafeId: cafeId,
                        foodCategoryId: categoryId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ category: category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/update/:cafeId/categories/:categoryId/image', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const { cafeId, categoryId } = req.params;
        const { userId } = getUserDetails(req)

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            {
                imageUrl,
                $push: {
                    lastChangesBy: {
                        whatUpdated: `imageUrl-${imageUrl}`,
                        cafeId: cafeId,
                        foodCategoryId: categoryId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ category: category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/update/:cafeId/categories/:categoryId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { cafeId, categoryId } = req.params;
        const { userId } = getUserDetails(req)

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, cafeId: cafeId },
            {
                status,
                $push: {
                    lastChangesBy: {
                        whatUpdated: `status-${status}`,
                        cafeId: cafeId,
                        foodCategoryId: categoryId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ category: category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @route DELETE /:cafeId/categories/:categoryId
 * @desc Delete a food category
 */
router.delete('/:cafeId/categories/:categoryId/delete', async (req, res) => {
    try {
        const { cafeId, categoryId } = req.params;

        const { userId } = getUserDetails(req);

        const category = await FoodCategory.findOneAndUpdate({ _id: categoryId, cafeId: cafeId }, {
            deleted: true,
            $push: {
                lastChangesBy: {
                    whatUpdated: 'deleted',
                    cafeId: cafeId,
                    foodCategoryId: categoryId,
                    userId: userId,
                    userType: 'User',
                }
            }
        });
        // ? change status of items under the category
        const changeFoodItemStatus = FoodItem.findOneAndUpdate({ category: categoryId }, {
            status: 'deactive'
        })

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /:cafeId/items
 * @desc Add a food item inside a specific cafe (Must be assigned to a category)
 */
router.post('/:cafeId/category/:categoryId/item/create', async (req, res) => {
    try {
        const { name, description, imageUrl, price, flavours,
            takeAwayPrice,
            takeAwayStatus,
            // bestSelling, 
            volume, discount, references } = req.body;
        const { cafeId, categoryId } = req.params;

        const { userId, campusOrigin, universityOrigin } = getUserDetails(req);


        const foodItemData = {
            name,
            description,
            imageUrl,
            price,
            flavours: flavours || [],
            cafeId: cafeId,
            // bestSelling,
            volume,
            discount,
            attachedCafe: cafeId,
            foodItemAddedBy: userId,
            foodItemAddedByModel: 'User',
            references: {
                universityId: universityOrigin,
                campusId: campusOrigin
            }
        };
        if (takeAwayStatus) {
            foodItemData.takeAwayPrice = takeAwayPrice;
            foodItemData.takeAwayStatus = true;
        }
        // Validate categoryId existence
        if (categoryId) {

            const categoryExists = await FoodCategory.findOne({ _id: categoryId, cafeId: cafeId });
            if (!categoryExists) return res.status(400).json({ error: 'Invalid category ID' });
            foodItemData.category = categoryId
        }

        const newItem = new FoodItem(foodItemData);


        const cafe = await Cafe.findByIdAndUpdate(cafeId, {
            $addToSet: {
                foodItems: newItem._id
            },
            $push: {
                lastChangesBy: {
                    whatUpdated: `FoodItem-${newItem._id}`,
                    cafeId,
                    userId: userId,
                    userType: 'User',
                    updatedAt: new Date()
                }
            }
        })

        await newItem.save();
        res.status(201).json({ item: newItem });
    } catch (error) {
        console.error("ERROR IN CREATE Food item", error)
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /:cafeId/items
 * @desc Get all food items in a specific cafe
 */
router.get('/:cafeId/items', async (req, res) => {
    try {
        const cafeId = req.params.cafeId;
        const items = await FoodItem.find({ cafeId: cafeId, deleted: false }).populate('category', 'name');
        res.status(200).json({ items: items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /:cafeId/items/:itemId
 * @desc Update a food item
 */
router.put('/:cafeId/items/:itemId/all', async (req, res) => {
    try {
        const { name, description, imageUrl, price, category, flavours, volume, discount } = req.body;
        const { cafeId, itemId } = req.params;
        const { userId } = getUserDetails(req);

        const item = await FoodItem.findOneAndUpdate(
            { _id: itemId, cafeId: cafeId, deleted: false },
            {
                name, description, imageUrl, price, category, flavours, volume, discount,

                $push: {
                    lastChangesBy: {
                        whatUpdated: `all-${name + "," + description + "," + imageUrl + "," + price + "," + category + "," + flavours + "," + volume + "," + discount}`,
                        cafeId: cafeId,
                        foodItemId: itemId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true }
        );

        if (!item) return res.status(404).json({ error: 'Item not found' });

        res.status(200).json({ item: item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const updateFoodItemField = (field) => async (req, res) => {
    const { cafeId, itemId } = req.params;
    const updateData = {};
    updateData[field] = req.body[field];

    try {
        const { userId, campusOrigin } = getUserDetails(req);
        const updatedFoodItem = await FoodItem.findByIdAndUpdate(
            { _id: itemId, cafeId: cafeId, deleted: false },
            {
                $set: updateData,
                $push: {
                    lastChangesBy: {
                        whatUpdated: `${field}-${updateData}`,
                        cafeId: cafeId,
                        foodItemId: itemId,
                        userId: userId,
                        userType: 'User',
                    }
                }
            },
            { new: true });

        if (!updatedFoodItem) return res.status(404).json({ message: "Food Item not found" });
        if (updatedFoodItem.references.campusId !== campusOrigin) {
            console.warn(`Unauthorized attempt to update cafe outside of campus: campusID ${campusOrigin} - food item id ${updatedFoodItem.references.campusId}`);
        }

        res.json({ message: `FoodItem ${field} updated successfully`, item: updatedFoodItem });
    } catch (error) {
        console.error(`Error updating cafe ${field}:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



router.patch('/update/:cafeId/item/:itemId/name', body('name').notEmpty(), handleValidationErrors, updateFoodItemField('name'));
router.patch('/update/:cafeId/item/:itemId/description', body('description').isString(), handleValidationErrors, updateFoodItemField('description'));
router.patch('/update/:cafeId/item/:itemId/imageUrl', body('imageUrl').isString(), handleValidationErrors, updateFoodItemField('imageUrl'));
router.patch('/update/:cafeId/item/:itemId/price', body('price').isNumeric(), handleValidationErrors, updateFoodItemField('price'));
router.patch('/update/:cafeId/item/:itemId/category', body('category'), handleValidationErrors, updateFoodItemField('category'));

router.patch('/update/:cafeId/item/:itemId/flavours', body('flavours').notEmpty().isString(), handleValidationErrors, updateFoodItemField('flavours'));

router.patch('/update/:cafeId/item/:itemId/volume', body('volume'), handleValidationErrors, updateFoodItemField('volume'));
router.patch('/update/:cafeId/item/:itemId/discount', body('discount').isNumeric, handleValidationErrors, updateFoodItemField('discount'));
router.patch('/update/:cafeId/item/:itemId/status', body('status').isIn(['active', 'archived', 'deactive']), handleValidationErrors, updateFoodItemField('status'));





/**
 * @route DELETE /:cafeId/items/:itemId
 * @desc Delete a food item
 */
router.delete('/:cafeId/item/:itemId', async (req, res) => {
    try {
        const { cafeId, itemId } = req.params;
        const { userId } = getUserDetails(req);

        const item = await FoodItem.findOneAndUpdate({ _id: itemId, cafeId: cafeId, deleted: false }, {
            deleted: true,

            $push: {
                lastChangesBy: {
                    whatUpdated: `delete`,
                    cafeId: cafeId,
                    foodItemId: itemId,
                    userId: userId,
                    userType: 'User',
                }
            }

        },
        );

        if (!item) return res.status(404).json({ error: 'Item not found' });

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
