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
            attachedCafe: cafeId,
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
        res.status(201).json(newCategory);
    } catch (error) {
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
        const categories = await FoodCategory.find({ attachedCafe: cafeId, deleted: false });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /:cafeId/categories/:categoryId
 * @desc Update a food category
 */
router.put('/:cafeId/categories/:categoryId', async (req, res) => {
    try {
        const { cafeId, categoryId } = req.params;
        const updateData = {};

        if (req.body.name) updateData.name = req.body.name;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            updateData,
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json({ message: 'Category updated successfully', category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/:cafeId/categories/:categoryId/name', async (req, res) => {
    try {
        const { name } = req.body;
        const { cafeId, categoryId } = req.params;

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            { name },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:cafeId/categories/:categoryId/description', async (req, res) => {
    try {
        const { description } = req.body;
        const { cafeId, categoryId } = req.params;

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            { description },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:cafeId/categories/:categoryId/image', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const { cafeId, categoryId } = req.params;

        const category = await FoodCategory.findOneAndUpdate(
            { _id: categoryId, attachedCafe: cafeId },
            { imageUrl },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @route DELETE /:cafeId/categories/:categoryId
 * @desc Delete a food category
 */
router.delete('/:cafeId/categories/:categoryId', async (req, res) => {
    try {
        const { cafeId, categoryId } = req.params;

        const category = await FoodCategory.findOneAndDelete({ _id: categoryId, attachedCafe: cafeId });

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
router.post('/:cafeId/items', async (req, res) => {
    try {
        const { name, description, imageUrl, price, category, flavours,
            // bestSelling, 
            volume, discount, references } = req.body;
        const cafeId = req.params.cafeId;

        const { userId, campusOrigin, universityOrigin } = getUserDetails(req);


        const foodItemData = {
            name,
            description,
            imageUrl,
            price,
            flavours: flavours || [],
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
        // Validate category existence
        if (category) {

            const categoryExists = await FoodCategory.findOne({ _id: category, attachedCafe: cafeId });
            if (!categoryExists) return res.status(400).json({ error: 'Invalid category ID' });
            foodItemData.category = category
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
                    userId: cafeUserId,
                    userType: 'User',
                    updatedAt: new Date()
                }
            }
        })

        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
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
        const items = await FoodItem.find({ attachedCafe: cafeId, deleted: false }).populate('category', 'name');
        res.status(200).json(items);
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

        const item = await FoodItem.findOneAndUpdate(
            { _id: itemId, attachedCafe: cafeId, deleted: false },
            { name, description, imageUrl, price, category, flavours, volume, discount },
            { new: true }
        );

        if (!item) return res.status(404).json({ error: 'Item not found' });

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const updateFoodItemField = (field) => async (req, res) => {
    const { cafeId, itemId } = req.params;
    const updateData = {};
    updateData[field] = req.body[field];

    try {
        // const { campusOrigin } = getUserDetails(req);
        const updatedFoodItem = await FoodItem.findByIdAndUpdate(
            { _id: itemId, attachedCafe: cafeId, deleted: false },
            { $set: updateData },
            { new: true });

        if (!updatedFoodItem) return res.status(404).json({ message: "Food Item not found" });
        if (updatedFoodItem.references.campusId !== campusOrigin) {
            console.warn(`Unauthorized attempt to update cafe outside of campus`);
        }

        res.json({ message: `FoodItem ${field} updated successfully`, foodITem: updatedFoodItem });
    } catch (error) {
        console.error(`Error updating cafe ${field}:`, error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



router.patch('/update/:cafeId/items/:itemId/name', body('name').notEmpty(), handleValidationErrors, updateFoodItemField('name'));
router.patch('/update/:cafeId/items/:itemId/description', body('description').isString(), handleValidationErrors, updateFoodItemField('description'));
router.patch('/update/:cafeId/items/:itemId/imageUrl', body('imageUrl').isString(), handleValidationErrors, updateFoodItemField('imageUrl'));
router.patch('/update/:cafeId/items/:itemId/price', body('price').isNumeric(), handleValidationErrors, updateFoodItemField('price'));
router.patch('/update/:cafeId/items/:itemId/category', body('category'), handleValidationErrors, updateFoodItemField('category'));

router.patch('/update/:cafeId/items/:itemId/flavours', body('flavours').notEmpty().isString(), handleValidationErrors, updateFoodItemField('flavours'));

router.patch('/update/:cafeId/items/:itemId/volume', body('volume'), handleValidationErrors, updateFoodItemField('volume'));
router.patch('/update/:cafeId/items/:itemId/discount', body('discount').isNumeric, handleValidationErrors, updateFoodItemField('discount'));





/**
 * @route DELETE /:cafeId/items/:itemId
 * @desc Delete a food item
 */
router.delete('/:cafeId/items/:itemId', async (req, res) => {
    try {
        const { cafeId, itemId } = req.params;

        const item = await FoodItem.findOneAndUpdate({ _id: itemId, attachedCafe: cafeId, deleted: false }, {
            deleted: true
        });

        if (!item) return res.status(404).json({ error: 'Item not found' });

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
