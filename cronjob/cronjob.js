const cron = require('node-cron');
const Teacher = require('../models/university/teacher/teacher.model');
const aiFeedback = require("../services/aifeedback.service");
const {default: PQueue} = require('p-queue'); // Queue to rate limit AI API calls
const ModUserCollection = require('../models/mod/mod.collection.model');
const User = require('../models/user/user.model');
const mongoose = require("mongoose")
const ModUser = require("../models/mod/mod.model");
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
// */5 * * * * 
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

////////////////////////////Moderator updates////////////////////////////////////
// after every hour we will check if a mod end time is reached and then we will convert him back to super_role none 
// then remove him from the mod collection nowmodusers and put him to prevmodusers


cron.schedule("0 * * * *", async () => {
  console.log("⏱️1 hr time 0 **** Running cron job to update moderator updates...");

  const session = await mongoose.startSession();
  session.startTransaction();

  let changesMade = false;

  try {
    console.log("🔍 Fetching ModUserCollections with active moderators...");
    const mods = await ModUserCollection.find({
      nowModUsers: { $exists: true, $ne: [] }
    }).populate({
      path: "nowModUsers",
      populate: {
        path: "_id",
        model: "User",
        select: "name _id"
      }
    }).session(session);

    console.log("MODS", mods)
    if (!mods || mods.length === 0) {
      console.log("❌ No mod collections found with active mods.");
      await session.commitTransaction();
      session.endSession();
      return;
    }

    console.log(`✅ Found ${mods.length} mod collections to process.`);

    for (const mod of mods) {
      console.log(`\n📦 Processing Mod Collection: ${mod._id}`);
      const expiredMods = [];

      console.log("xpired? time",mods )
      for (const modUser of mod.nowModUsers) {
        if (modUser.endTime <= new Date()) {
          console.log(`🔻 Mod expired: ${modUser._id} (${modUser._id.name})`);
          expiredMods.push({
            userId: modUser._id,
            startTime: modUser.startTime,
            predefinedEndTime: modUser.predefinedEndTime,
            endTime: modUser.endTime,
          });
        }
      }

      if (expiredMods.length > 0) {
        changesMade = true;
        const expiredIds = expiredMods.map(m => m.userId);
        console.log("👥 Expired mod IDs:", expiredIds);

        console.log("📝 Updating user roles to 'none'...");
        const user = await User.updateMany(
          { _id: { $in: expiredIds } },
          { $set: { super_role: "none" } },
          { session }
        );

        console.log("📤 Moving expired mods to prevModUsers...");
        mod.prevModUsers.push(...expiredMods);

        console.log("🧹 Removing expired mods from nowModUsers...");
        mod.nowModUsers = mod.nowModUsers.filter(
          u => !expiredMods.find(e => e.userId.equals(u._id))
        );

        console.log("💾 Saving updated ModUserCollection...");
        await mod.save({ session });

        const modUser = await ModUser.findById(user._id);
        modUser.isNotModAnymore = true;
        modUser.reason = "Moderation time expired - Cronjob";
        await modUser.save();

        console.log(`✅ Done: Mod Collection ${mod._id} updated.`);
      } else {
        console.log("✅ No expired mods in this collection.");
      }
    }

    if (changesMade) {
      await session.commitTransaction();
      console.log("🎉 Moderator updates committed.");
    } else {
      await session.abortTransaction();
      console.log("ℹ️ No changes detected. Nothing to commit.");
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("❗ Cron job failed:", error);
  } finally {
    session.endSession();
    console.log("🛑 Mongo session ended.\n");
  }
});

// cron.schedule("* * * * *", async () => {
//   console.log("Running cron job to update moderator updates... * * * * *");

//   try {
//     const mods = await ModUserCollection.find({
//       nowModUsers: { $exists: true, $ne: [] }
//     }).populate({
//         path: "nowModUsers",
//         populate: {
//             path: "_id",
//             model: "User",
//             select: "name _id"
//         }
//     });

//     if (!mods || mods.length === 0) {
//       console.log("No mods found.");
//       return;
//     }

//     for (const mod of mods) {
//       const expiredMods = [];

//       for (const modUser of mod.nowModUsers) {
//         if (modUser.endTime <= new Date()) {
//           expiredMods.push({
//             userId: modUser._id,
//             startTime: modUser.startTime,
//             predefinedEndTime: modUser.predefinedEndTime,
//             endTime: modUser.endTime,
//           });
//         }
//       }

//       if (expiredMods.length > 0) {
//         mod.prevModUsers.push(...expiredMods);
//         mod.nowModUsers.pull({_id: {$in: expiredMods.map(mod => mod._id)}});
//         await mod.save();
//         await User.findByIdAndUpdate(modUser._id, {super_role: "none"});
//         console.log(`Updated mod collection: ${mod._id}`);
//       }
//     }

//     console.log("Moderator updates updated.");
//   } catch (error) {
//     console.error("Cron job failed:", error);
//   }
// });

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