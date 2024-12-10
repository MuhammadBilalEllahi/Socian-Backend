router.post("/create-event", async (req, res) => {
    const { societyId, area, startTime, endTime } = req.body;

    try {
        const event = new Event({ societyId, area, startTime, endTime });
        await event.save();

        res.status(200).json({ message: "Event created successfully", event });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/mark-attendance", async (req, res) => {
    const { userId, eventId, latitude, longitude } = req.body;

    try {
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const isInEventArea = geolib.isPointInPolygon(
            { latitude, longitude },
            event.area.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        );

        if (!isInEventArea) {
            return res.status(400).json({ message: "You are not in the event area" });
        }

        const attendance = await EventAttendance.findOneAndUpdate(
            { memberId: userId, eventId },
            { $inc: { timeSpent: 1 } },
            { upsert: true, new: true }
        );

        if (attendance.timeSpent >= 30) {
            attendance.isPresent = true;
            await attendance.save();
        }

        res.status(200).json({ message: "Attendance updated", attendance });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/event-attendance/:eventId", async (req, res) => {
    try {
        const attendance = await EventAttendance.find({ eventId: req.params.eventId });

        res.status(200).json(attendance);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
