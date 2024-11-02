import Notification from "../models/notification.model.js";
import User from "../models/user.model.js"
import bcrypt from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary';
// Controller to retrieve a user's public profile by username
export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        // Fetch the user by username, excluding the password field for security
        const user = await User.findOne({ username }).select('-password');
        
        // If no user is found, respond with a 404 status and descriptive message
        if (!user) {
            return res.status(404).json({ 
                error: 'No user found with the specified username.' 
            });
        }

        // Send the user profile data as a JSON response
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error.message);

        // Server error response with a clear message for the client
        res.status(500).json({ 
            error: 'An unexpected error occurred while retrieving the user profile. Please try again later.' 
        });
    }
};
export const followUnFollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent self-follow/unfollow action
        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: 'You cannot follow/unfollow yourself' });
        }

        // Retrieve users
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);
        
        if (!userToModify || !currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isFollowing = currentUser.following.includes(id);

        // Update followers/following lists based on follow/unfollow action
        if (isFollowing) {
            await User.updateOne({ _id: id }, { $pull: { followers: req.user._id } });
            await User.updateOne({ _id: req.user._id }, { $pull: { following: id } });
            return res.status(200).json({ message: 'User unfollowed successfully' });
        } else {
            await User.updateOne({ _id: id }, { $push: { followers: req.user._id } });
            await User.updateOne({ _id: req.user._id }, { $push: { following: id } });
            const newNotification = new Notification({
                type:'follow',
                from: req.user._id,
                to:userToModify._id,
                
            })
            await newNotification.save()
            return res.status(200).json({ message: 'User followed successfully' });
        }

    } catch (error) {
        console.error('Error in followUnFollowUser:', error.message);
        return res.status(500).json({ 
            error: 'An unexpected error occurred. Please try again later.' 
        });
    }
};
export const getSuggestedUsers = async (req, res) => {
    try {
        // Get the ID of the current user making the request
        const userId = req.user._id;

        // Retrieve the list of users that the current user is following
        const userFollowedByMe = await User.findById(userId).select('following');
console.log(userFollowedByMe)
        // Fetch a random sample of 10 users, excluding the current user
        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId } // Exclude the current user from the result set
                }
            },
            { $sample: { size: 10 } } // Randomly select 10 users
        ]);

        // Filter out users that the current user is already following
        const filteredUsers = users.filter(user => !userFollowedByMe.following.includes(user._id));

        // Limit the suggested users to a maximum of 4
        const suggestedUsers = filteredUsers.slice(0, 4);

        // Remove password fields from each suggested user for security
        suggestedUsers.forEach(user => user.password = null);

        // Send the list of suggested users as a JSON response
        res.status(200).json(suggestedUsers);
    } catch (error) {
        // Log and handle any errors that occur
        console.error('Error in suggested Users:', error.message);
        return res.status(500).json({ 
            error: 'An unexpected error occurred. Please try again later.' 
        });
    }
};
export const updateUser = async (req, res) => {
    // Extract user details and images from the request body
    const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
    let { profileImg, coverImg } = req.body;
    const userId = req.user._id;

    try {
        // Fetch user by ID
        let user = await User.findById(userId);
        if (!user) {
            // If user does not exist, send a 404 error response
            return res.status(404).json({ error: 'User not found. Please ensure you are logged in.' });
        }

        // Validate password change fields if provided
        if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
            // If one password field is missing, return a 400 error
            return res.status(400).json({ error: 'Both current and new passwords are required to change your password.' });
        }

        // If password update is requested, verify current password
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                // If current password does not match, return a 400 error
                return res.status(400).json({ error: 'The current password provided is incorrect. Please try again.' });
            }
            if (newPassword.length < 6) {
                // Enforce minimum password length for new password
                return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
            }

            // Generate a new hash for the updated password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Handle profile image update if a new image is provided
        if (profileImg) {
            if (user.profileImg) {
                // Delete existing image from cloud storage
                const publicId = user.profileImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            // Upload new profile image and update URL
            const uploadResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadResponse.secure_url;
        }

        // Handle cover image update if a new image is provided
        if (coverImg) {
            if (user.coverImg) {
                // Delete existing cover image from cloud storage
                const publicId = user.coverImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            // Upload new cover image and update URL
            const uploadResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadResponse.secure_url;
        }

        // Update user fields with provided values or keep existing values
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        // Save updated user details to database
        await user.save();
        user.password = undefined; // Remove password from response for security

        // Send success response with updated user data
        return res.status(200).json(user);
    } catch (error) {
        // Log error to console and send a 500 error response
        console.error('Error in updating user:', error.message);
        return res.status(500).json({ error: 'An unexpected server error occurred. Please try again later or contact support if the issue persists.' });
    }
};
