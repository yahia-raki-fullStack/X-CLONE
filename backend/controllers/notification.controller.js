import Notification from "../models/notification.model.js"

export const getNotifications = async (req, res) => {
    try {
        // Ensure user is authenticated and userId is available
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        // Fetch notifications for the user and populate sender details
        const notifications = await Notification.find({ to: userId })
            .populate({
                path: 'from',
                select: 'username profileImg',
            })
            .lean(); // Optimize for read performance

        // Mark notifications as read
        await Notification.updateMany({ to: userId, read: false }, { read: true });

        // Return fetched notifications
        return res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error); // Log error for debugging
        return res.status(500).json({ error: "An error occurred while fetching notifications" });
    }
};

export const deleteNotifications = async (req, res) => {
    try {
        // Ensure user is authenticated
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        // Delete all notifications for the authenticated user
        const result = await Notification.deleteMany({ to: userId });

        // Return success response
        return res.status(200).json({
            message: `${result.deletedCount} notification(s) deleted successfully`,
        });
    } catch (error) {
        console.error("Error deleting notifications:", error); // Log error for debugging
        return res.status(500).json({ error: "An error occurred while deleting notifications" });
    }
};

