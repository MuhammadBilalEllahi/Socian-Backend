const express = require('express');
const Subject = require('../../../models/university/department/subject/subject.department.model');
const University = require('../../../models/university/university.register.model');
const Campus = require('../../../models/university/campus.university.model');
const Department = require('../../../models/university/department/department.university.model');
const AcademicFormat = require('../../../models/university/academic.format.model');
const router = express.Router()




// Use when format not created by default
router.post("/create-new-format", async (req, res) => {
    const { formatType } = req.body;

    try {

        const findAcademicFormatType =
            await AcademicFormat.findOne({ formatType })
        if (findAcademicFormatType) return res.status(404).json({ message: "Format Already Created" })

        const createAcademicFormat =
            await AcademicFormat.create({ formatType })


        if (!createAcademicFormat) return res.status(404).json({ message: "Error in Academic Format" })


        res.status(200).json(createAcademicFormat)


    } catch (error) {
        console.error('Error in subject:', error);
        res.status(500).json({ message: error.message });
    }
})


router.post("/add-format-to-campus", async (req, res) => {
    const { RequestedFormatEnum,
        universityOrigin,
        campusOrigin } = req.body;

    try {

        const findAcademicFormatType =
            await AcademicFormat.findOne({
                'formatType': RequestedFormatEnum
            })
        if (!findAcademicFormatType) return res.status(404).json({ message: "Format Already Found" })

        const findUni = await University.findOne({ _id: universityOrigin })
        if (!findUni) return res.status(404).json({ message: "no such University found" })

        const findCampus = await Campus.findOne({ _id: campusOrigin, "universityOrigin": universityOrigin })
        if (!findCampus) return res.status(404).json({ message: "no such Campus found" })

        findCampus.academic.FormatId = findAcademicFormatType._id
        findCampus.academic.FormatType = findAcademicFormatType.formatType

        if (!findAcademicFormatType.references.some(ref => ref.campusOrigin.equals(campusOrigin))) {
            findAcademicFormatType.references.push({
                universityOrigin: findUni._id,
                campusOrigin: findCampus._id,
            });
        }
        // findAcademicFormatType.references.push({
        //     universityOrigin: findUni._id,
        //     campusOrigin: findCampus._id
        // })

        await findCampus.save()
        await findAcademicFormatType.save()

        res.status(200).json({ updatedCampus: findCampus, updatedFormat: findAcademicFormatType });


    } catch (error) {
        console.error('Error in subject:', error);
        res.status(500).json({ message: error.message });
    }
})


router.get('/academic-pattern', async (req, res) => {
    try {

    } catch (error) {

    }
})




module.exports = router;