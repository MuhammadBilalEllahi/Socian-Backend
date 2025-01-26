const saveSession = (req, res) => {
    return new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                reject({ status: 500, message: "Internal Server Error" });
            } else {
                resolve({ status: 201, message: "User with role teacher attached with Modal successfully" });
            }
        });
    });
};

const sessionSaveHandler = async (req, res) => {
    try {
        const response = await saveSession(req, res);
        return res.status(response.status).json({ message: response.message });
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Something went wrong" });
    }
};

module.exports = { sessionSaveHandler, saveSession }