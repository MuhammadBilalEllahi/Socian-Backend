const cron = require('node-cron');
const Teacher = require('../models/university/teacher/teacher.model');
const aiFeedback = require("../services/aifeedback.service");
const {default: PQueue} = require('p-queue'); // Queue to rate limit AI API calls

// Initialize the queue with a concurrency limit (e.g., 5 simultaneous API calls)
const queue = new PQueue({ concurrency: 5 });

////////////////////////////Teacher feedback updates////////////////////////////////////
async function updateTeacherFeedbackSummary(teacher) {
    try {
        // Extract feedback texts
        const feedbackTexts = teacher?.ratingsByStudents?.map(rating => rating.feedback) || [];

        // Check if there are new feedback and if the summary needs to be updated
        if (feedbackTexts.length === 0) {
            if (teacher.feedbackSummary[0]?.summary === "No feedback available yet.") {
                console.log(`Feedback summary already up-to-date for teacher: ${teacher.name}`);
                return; // No update needed
            }

            teacher.feedbackSummary = [{
                summary: "No feedback available yet.",
                date: Date.now()
            }];
        } else {
            // Check if the feedback has changed since the last update
            const lastUpdated = teacher.feedbackSummary[teacher.feedbackSummary.length - 1]?.date;
            if (lastUpdated && Date.now() - lastUpdated < 24 * 60 * 60 * 1000) {
                console.log(`Feedback summary for teacher: ${teacher.name} is already up-to-date.`);
                return; // Don't regenerate summary if it's recent (within 24 hours)
            }

            // Generate AI summary and queue the request to limit concurrency
            const summary = await queue.add(() => aiFeedback(feedbackTexts.join("\n")));

            teacher.feedbackSummary.push({
                summary: summary,
                date: Date.now()
            });
        }

        // Save the teacher document if anything changed
        await teacher.save();
        console.log("Feedback summary updated for", teacher.name);
    } catch (error) {
        console.error("Error updating feedback summary:", error);
    }
}

cron.schedule("35 7 * * *", async () => {
    console.log("Running cron job to update teacher feedback summary... 35 7 * * *");

    try {
        // Fetch all teachers but only the necessary fields to minimize the load
        const teachers = await Teacher.find({})
            .select("_id name ratingsByStudents feedbackSummary") // Only fetch the needed fields
            .populate("ratingsByStudents", "feedback"); // Only populate the feedback field

        if (!teachers || teachers.length === 0) {
            console.log("No teachers found.");
            return;
        }

        // Batch process teachers in parallel (using Promise.all with queue to limit concurrency)
        const updatePromises = teachers.map(teacher => updateTeacherFeedbackSummary(teacher));
        
        // Wait for all updates to finish
        await Promise.all(updatePromises);

        console.log("All feedback summaries updated.");
    } catch (error) {
        console.error("Cron job failed:", error);
    }
});


// BELOW COdE is befoer optimazation. So, keep it for future reference


// const cron = require('node-cron');
// const Teacher = require('../models/university/teacher/teacher.model');
// const aiFeedback = require("../services/aifeedback.service")




// ////////////////////////////Teacher feedback updates////////////////////////////////////
// async function updateTeacherFeedbackSummary(teacherId) {
//     try {
//         const teacher = await Teacher.findById(teacherId).populate("ratingsByStudents");

//         if (!teacher) {
//             console.error("Teacher not found");
//             return;
//         }

//         // Extract feedback texts
//         const feedbackTexts = teacher?.ratingsByStudents?.map(rating => rating.feedback)|| [];

//         if (feedbackTexts.length === 0) {
//             teacher.feedbackSummary.push({
//                 summary: "No feedback available yet.",
//                 date: Date.now()
//             });
//         } else {
//             const summary = await aiFeedback(feedbackTexts.join("\n"));
//             teacher.feedbackSummary.push({
//                 summary: summary,
//                 date: Date.now()
//             });
//         }


//         await teacher.save();
//         console.log("Feedback summary updated for", teacher.name);
//     } catch (error) {
//         console.error("Error updating feedback summary:", error);
//     }
// }

// cron.schedule("0 0 * * *", async () => {
//     console.log("Running cron job to update teacher feedback summary...");
//     const teachers = await Teacher.find({});
//     if (!teachers || teachers.length === 0) {
//         console.log("No teachers found.");
//         return;
//     }
//     for (const teacher of teachers) {
//         console.log("Updating feedback summary for teacher:", teacher.name);
//         // Call the function to update feedback summary for each teacher
//         await updateTeacherFeedbackSummary(teacher._id);
//     }
// });