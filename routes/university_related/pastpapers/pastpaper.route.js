const express = require('express');
const Subject = require('../../../models/university/department/subject/subject.department.model');
const University = require('../../../models/university/university.register.model');
const Campus = require('../../../models/university/campus.university.model');
const Department = require('../../../models/university/department/department.university.model');
const AcademicFormat = require('../../../models/university/academic.format.model');
const { PastPaper, PastpapersCollectionByYear } = require('../../../models/university/papers/pastpaper.subject.model');
const router = express.Router()



// Route to get all assignments for the given paperId by year
async function fetchPastPaperData(req, res, type) {
    try {
        const { paperId } = req.params;

        const findSubject = await Subject.findOne({ _id: paperId });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });



        console.log("PAspt", paperId, req.params);
        const papers = await PastPaper.find({ 'references.subjectId': paperId })
            .populate('references.subjectId') // Optional: if you need details from the subject
            .lean();



        console.log("PAspt2", papers);
        if (!papers || papers.length === 0) {
            return res.status(404).json({ message: 'Past paper not found' });
        }

        // Filter papers by the requested type and organize by year
        const result = papers.reduce((acc, paper) => {
            const year = paper.year;
            if (!acc[year]) {
                acc[year] = [];
            }

            // Handle different types of documents
            if (type === 'assignments' && paper.assignments.length > 0) {
                acc[year].push(...paper.assignments); // Push all assignments
            } else if (type === 'quizzes' && paper.quizzes.length > 0) {
                acc[year].push(...paper.quizzes); // Push all quizzes
            } else if (type === 'midterm') {
                // Push both fall and spring midterms
                if (paper.fall.mid && paper.fall.mid.length > 0) acc[year].push({ term: 'fall', mid: paper.fall.mid });
                if (paper.spring.mid && paper.spring.mid.length > 0) acc[year].push({ term: 'spring', mid: paper.spring.mid });
            } else if (type === 'final') {
                // Push both fall and spring finals
                if (paper.fall.final && paper.fall.final.length > 0) acc[year].push({ term: 'fall', final: paper.fall.final });
                if (paper.spring.final && paper.spring.final.length > 0) acc[year].push({ term: 'spring', final: paper.spring.final });
            } else if (type === 'sessional') {
                // Push both fall and spring sessionals
                if (paper.fall.sessional && paper.fall.sessional.length > 0) acc[year].push({ term: 'fall', sessional: paper.fall.sessional });
                if (paper.spring.sessional && paper.spring.sessional.length > 0) acc[year].push({ term: 'spring', sessional: paper.spring.sessional });
            }

            return acc;
        }, {});

        // If no data is found, return null instead of an empty object
        const finalResult = Object.keys(result).length === 0 ? null : result;
        res.status(200).json({ finalResult, subjectName: findSubject.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}


router.get('/assignments/:paperId', (req, res) => fetchPastPaperData(req, res, 'assignments'));
// Route to get all quizzes for the given paperId by year
router.get('/quizzes/:paperId', (req, res) => fetchPastPaperData(req, res, 'quizzes'));
// Route to get all midterms for the given paperId by year
router.get('/midterms/:paperId', (req, res) => fetchPastPaperData(req, res, 'midterm'));
// Route to get all sessionals for the given paperId by year
router.get('/sessionals/:paperId', (req, res) => fetchPastPaperData(req, res, 'sessional'));
// Route to get all finals for the given paperId by year
router.get('/finals/:paperId', (req, res) => fetchPastPaperData(req, res, 'final'));




router.get("/all-pastpapers-in-subject/:id", async (req, res) => {
    const subjectId = req.params.id
    console.log("Refernces: ", req.session.references, subjectId)
    try {
        const universityOrigin = req.session.references.university._id;
        const campusOrigin = req.session.references.campus._id

        // const findUni = await University.findOne({ _id: universityOrigin })
        // if (!findUni) return res.status(404).json({ message: "no such University found" })

        // const findCampus = await Campus.findOne({ _id: campusOrigin, "universityOrigin": universityOrigin })
        // if (!findCampus) return res.status(404).json({ message: "no such Campus found" })

        // const findDepartment = await Department.findOne({ _id: departmentId, 'references.campusOrigin': campusOrigin, "references.universityOrigin": universityOrigin })
        // if (!findDepartment) return res.status(404).json({ message: "no such Department found" })

        const findSubject = await Subject.findOne({
            _id: subjectId,
            // 'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        })
        if (!findSubject) return res.status(404).json({ message: "no such subject found" })

        console.log(findSubject)
        console.log(
            // "findSubject.references.departmentId", findSubject.references.departmentId,

            "\ndepartmentId", findSubject.references.departmentId.toHexString(),
            "\nuniversityOrigin", universityOrigin,
            "\ncampusOrigin", campusOrigin,
            "\npastcollection", findSubject.pastpapersCollectionByYear.toHexString(),
            "\nsubjectId: ", findSubject._id.toHexString(), "\n"
        )


        const findpastpapers = await PastpapersCollectionByYear.find({
            _id: findSubject.pastpapersCollectionByYear.toHexString(),
            // references: {
            //     subjectId: findSubject._id.toHexString(),
            //     universityOrigin,
            //     campusOrigin,
            // }
        }).populate('pastpapers')


        console.log("findPastpapersCollection", findpastpapers)
        console.log("findPastpapersCollection", findpastpapers.map(past => past.pastpapers))
        const listOfPastPapers = findpastpapers.map(past => past.pastpapers)
        res.status(200).json({ pastPapers: listOfPastPapers, subjectName: findSubject.name });



    } catch (error) {
        console.error('Error in subject:', error);
        res.status(500).json({ message: error.message });
    }
})



// this is to upload one assignment [testing phase]
router.post("/upload-single-assignment", async (req, res) => {
    const {
        year,
        assignment,
        file,
        subjectId,
        departmentId,
        // campusOrigin=req.session.references.campus._id,
        //  universityOrigin=req.session.references.university._id
    } = req.body;

    const campusOrigin = req.session.references.campus._id
    const universityOrigin = req.session.references.university._id

    try {
        console.log("Here", year,
            assignment,
            file,
            subjectId,
            departmentId,
            campusOrigin,
            universityOrigin)
        // Find the subject based on the provided references
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });



        // Retrieve the Past Papers Collection by Year for the found subject
        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        // console.log(findPastpapersCollection, findSubject.pastpapersCollectionByYear._id.toHexString(),)
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        // Find or create a PastPaper for the specified year
        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id); // Link the new pastpaper to the collection
        } else {
            pastpaper = await PastPaper.findOne({
                _id: pastpaper._id,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
        }

        // Add the assignment to the pastpaper's assignments array
        pastpaper.assignments.push({ name: assignment, 'file.pdf': file });
        await pastpaper.save(); // Save changes to the pastpaper

        await findPastpapersCollection.save(); // Save the collection updates

        res.status(200).json({
            message: "Past Paper created or updated successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error in subject:', error);
        res.status(500).json({ message: error.message });
    }
});




// router.post("/upload-single-assignment", async (req, res) => {
//     const {
//         year, assignment
//         , subjectId, departmentId, campusOrigin, universityOrigin
//     } = req.body;

//     try {

//         // const findUni = await University.findOne({ _id: universityOrigin })
//         // if (!findUni) return res.status(404).json({ message: "no such University found" })

//         // const findCampus = await Campus.findOne({ _id: campusOrigin, "universityOrigin": universityOrigin })
//         // if (!findCampus) return res.status(404).json({ message: "no such Campus found" })

//         // const findDepartment = await Department.findOne({ _id: departmentId, 'references.campusOrigin': campusOrigin, "references.universityOrigin": universityOrigin })
//         // if (!findDepartment) return res.status(404).json({ message: "no such Department found" })

//         const findSubject = await Subject.findOne({
//             _id: subjectId,
//             'references.departmentId': departmentId,
//             'references.universityOrigin': universityOrigin,
//             'references.campusOrigin': campusOrigin,
//         })
//         if (!findSubject) return res.status(404).json({ message: "no such subject found" })

//         const findpastpapersCollection = await PastpapersCollectionByYear.findOne({
//             _id: findSubject.pastpapersCollectionByYear._id,
//             reference: {
//                 departmentId,
//                 universityOrigin,
//                 campusOrigin,
//             }
//         })
//         let pastpaper = null

//         if (!findpastpapersCollection.pastpapers.some(val => val.year === year)) {
//             pastpaper = await PastPaper.create({
//                 year: year,
//                 reference: {
//                     subjectId,
//                     universityOrigin,
//                     campusOrigin,
//                 }
//             })
//         } else {
//             pastpaper = await PastPaper.findOne({
//                 year: year,
//                 reference: {
//                     subjectId,
//                     universityOrigin,
//                     campusOrigin,
//                 }
//             })
//         }
//         pastpaper.assignments.push(assignment)





//         findpastpapers.pastpapers.push()
//         // confusing as shit
//         // findpastpapers.where({ year: 2024 }).add(some pdf that i want to upload to assignmnet)
//         // findpastpapers.where({ year: 2024 }).add(some pdf that i want to upload to fall -> final)
//         // findpastpapers.where({ year: 2024 }).add(some pdf that i want to upload to sessional(whoose option is not available in my frontedn for user so no issue but still i cant upload to sessional because i can only upload to mid as my academicformat here is MIDTERM)  )




//         await findSubject.save()
//         res.status(200).json({
//             message: "Past Paper created successfully",
//             createdPastPaper: createPastpaper,
//             updatedSubject: findSubject
//         });



//     } catch (error) {
//         console.error('Error in subject:', error);
//         res.status(500).json({ message: error.message });
//     }
// })













// create a pastpaper to an existing subject
router.post("/create-pastpaper-id-attach-exisiting-subject", async (req, res) => {
    const { subjectId, departmentId, campusOrigin, universityOrigin } = req.body;

    try {

        const findUni = await University.findOne({ _id: universityOrigin })
        if (!findUni) return res.status(404).json({ message: "no such University found" })

        const findCampus = await Campus.findOne({ _id: campusOrigin, "universityOrigin": universityOrigin })
        if (!findCampus) return res.status(404).json({ message: "no such Campus found" })

        const findDepartment = await Department.findOne({ _id: departmentId, 'references.campusOrigin': campusOrigin, "references.universityOrigin": universityOrigin })
        if (!findDepartment) return res.status(404).json({ message: "no such Department found" })

        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        })
        if (!findSubject) return res.status(404).json({ message: "no such subject found" })


        const createPastpaperCollectionByYear = await PastpapersCollectionByYear.create({
            type: findCampus.academic.FormatType,
            references: {
                universityOrigin: findUni._id,
                subjectId: findSubject._id,
                campusOrigin: findCampus._id
            }
        })

        findSubject.pastpapersCollectionByYear = createPastpaperCollectionByYear._id

        await findSubject.save()
        res.status(200).json({
            message: "Past Paper created successfully",
            createdPastPaper: createPastpaper,
            updatedSubject: findSubject
        });



    } catch (error) {
        console.error('Error in subject:', error);
        res.status(500).json({ message: error.message });
    }
})




































































































router.post("/upload-assignment", async (req, res) => {
    const { year, assignment, subjectId, departmentId } = req.body;
    const universityOrigin = req.session.references.university._id;
    const campusOrigin = req.session.references.campus._id;

    try {
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });

        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id);
        }

        pastpaper.assignments.push({ name: assignment });
        await pastpaper.save();
        await findPastpapersCollection.save();

        res.status(200).json({
            message: "Assignment added successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error adding assignment:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post("/upload-quiz", async (req, res) => {
    const { year, quiz, subjectId, departmentId } = req.body;
    const universityOrigin = req.session.references.university._id;
    const campusOrigin = req.session.references.campus._id;

    try {
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });

        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id);
        }

        pastpaper.quizzes.push({ name: quiz });
        await pastpaper.save();
        await findPastpapersCollection.save();

        res.status(200).json({
            message: "Quiz added successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error adding quiz:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post("/upload-midterm", async (req, res) => {
    const { year, term, midterm, subjectId, departmentId } = req.body;
    const universityOrigin = req.session.references.university._id;
    const campusOrigin = req.session.references.campus._id;

    try {
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });

        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id);
        }

        if (term === 'fall') {
            pastpaper.fall.mid.push({ name: midterm });
        } else if (term === 'spring') {
            pastpaper.spring.mid.push({ name: midterm });
        }

        await pastpaper.save();
        await findPastpapersCollection.save();

        res.status(200).json({
            message: "Midterm added successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error adding midterm:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post("/upload-final", async (req, res) => {
    const { year, term, finalExam, subjectId, departmentId } = req.body;
    const universityOrigin = req.session.references.university._id;
    const campusOrigin = req.session.references.campus._id;

    try {
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });

        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id);
        }

        if (term === 'fall') {
            pastpaper.fall.final.push({ name: finalExam });
        } else if (term === 'spring') {
            pastpaper.spring.final.push({ name: finalExam });
        }

        await pastpaper.save();
        await findPastpapersCollection.save();

        res.status(200).json({
            message: "Final Exam added successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error adding final exam:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post("/upload-sessional", async (req, res) => {
    const { year, term, sessional, subjectId, departmentId } = req.body;
    const universityOrigin = req.session.references.university._id;
    const campusOrigin = req.session.references.campus._id;

    try {
        const findSubject = await Subject.findOne({
            _id: subjectId,
            'references.departmentId': departmentId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findSubject) return res.status(404).json({ message: "No such subject found" });

        const findPastpapersCollection = await PastpapersCollectionByYear.findOne({
            _id: findSubject.pastpapersCollectionByYear._id,
            'references.subjectId': subjectId,
            'references.universityOrigin': universityOrigin,
            'references.campusOrigin': campusOrigin,
        });
        if (!findPastpapersCollection) return res.status(404).json({ message: "No past papers collection found" });

        let pastpaper = findPastpapersCollection.pastpapers.find(val => val.year === year);
        if (!pastpaper) {
            pastpaper = await PastPaper.create({
                year: year,
                references: {
                    subjectId,
                    universityOrigin,
                    campusOrigin,
                }
            });
            findPastpapersCollection.pastpapers.push(pastpaper._id);
        }

        pastpaper.sessional.push({ name: sessional });
        await pastpaper.save();
        await findPastpapersCollection.save();

        res.status(200).json({
            message: "Sessional added successfully",
            createdPastPaper: pastpaper,
            updatedSubject: findSubject
        });

    } catch (error) {
        console.error('Error adding sessional:', error);
        res.status(500).json({ message: error.message });
    }
});



































module.exports = router;