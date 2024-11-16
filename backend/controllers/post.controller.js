import { v2 as cloudinary} from "cloudinary"
import Post from "../models/post.model.js"
import User from "../models/user.model.js"
import Notification from "../models/notification.model.js";


export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
        let { img } = req.body;

        const userId = req.user._id.toString();
        const user = await User.findById(userId);

        // Check if user exists
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Check for required fields
        if (!text && !img) {
            return res.status(400).json({ error: 'Text and image are required.' });
        }

        // Upload image to Cloudinary
        if (img) {
            const uploadResponse = await cloudinary.uploader.upload(img);
            if (!uploadResponse || !uploadResponse.secure_url) {
                return res.status(500).json({ error: 'Failed to upload image.' });
            }
            img = uploadResponse.secure_url;
        }

        // Create new post
        const newPost = new Post({
            user: userId,
            text,
            img
        });

        // Save the post
        await newPost.save();
        
        return res.status(201).json(newPost);

    } catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const deletePost = async (req, res) => {
    try {
        // Find the post by ID
        const post = await Post.findById(req.params.id);
        
        // Check if the post exists
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if the user is authorized to delete the post
        if (post.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized action' });
        }

        // Delete the image from Cloudinary if it exists
        if (post.img) {
            const imgId = post.img.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(imgId);
        }

        // Delete the post from the database
        await Post.findByIdAndDelete(req.params.id);
        
        // Respond with success
      return  res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        // Handle errors and respond
        res.status(500).json({ error: 'Server error, please try again later' });
    }
};

export const commentOnPost = async (req, res) => {
    try {
        // Extract text from request body and postId from request parameters
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        // Validate comment text
        if (!text) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        // Find the post by ID
        const post = await Post.findById(postId);
        
        // Check if the post exists
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Create the comment and add to the post's comments array
        const comment = { user: userId, text };
        post.comments.push(comment);
        
        // Save the updated post with the new comment
        await post.save();

        // Return the updated post
        return res.status(200).json(post);
    } catch (error) {
        // Handle any server errors
        res.status(500).json({ error: 'Server error, please try again later' });
    }
};
export const likeUnlikePost = async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user._id;

        // Find post by ID
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if the user has already liked the post
        const userLikedPost = post.likes.includes(userId);

        if (userLikedPost) {
            // Unlike the post if already liked
            await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
            await User.updateOne({ _id: postId }, { $pull: { likedPosts: postId } });
            return res.status(200).json({ message: 'Post unliked successfully' });
        } else {
            // Like the post if not liked yet
            post.likes.push(userId);
            await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
            await post.save();
            

            // Create a notification for the like
            const notification = new Notification({
                from: userId,
                to: post.user,
                type: 'like',
            });
            await notification.save();

            return res.status(200).json({ message: 'Post liked successfully' });
        }
    } catch (error) {
        // Handle server errors
        res.status(500).json({ error: 'Server error, please try again later' });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'user',
                select: '-password'
            })
            .populate({
                path: 'comments.user',
                select: '-password'
            });
        
        // Respond with posts or an empty array if no posts are found
        res.status(200).json(posts.length ? posts : []);
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while retrieving posts', error: error.message });
    }
};


export const getLikedPosts = async (req, res) => {
    const userId = req.params.id;

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find posts liked by the user
        const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
            .populate({ path: 'user', select: '-password' })
            .populate({ path: 'comments.user', select: '-password' });

        // Respond with liked posts or an empty array if none are found
        res.status(200).json(likedPosts.length ? likedPosts : []);
    } catch (error) {
        console.error("Error retrieving liked posts:", error);  // Log error for debugging
        res.status(500).json({ message: 'An error occurred while retrieving liked posts', error: error.message });
    }
};


export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch posts from following users
        const feedPosts = await User.find({ _id: { $in: user.following } })
            .sort({ createdAt: -1 })
            .populate({ path: 'user', select: '-password' }) // Hide sensitive info
            .populate({ path: 'comments.user', select: '-password' }) // Populate comment authors
            .lean(); // Optimize performance by returning plain JS objects

        // Respond with the feed posts
        return res.status(200).json(feedPosts);
    } catch (error) {
        console.error(error); // Log error for debugging
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const { username } = req.params;

        // Check if username is provided
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        // Find the user by username
        const user = await User.findOne({ username }).lean();
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Fetch and sort the user's posts, populating related fields
        const posts = await Post.find({ user: user._id })
            .sort({ createdAt: -1 })
            .populate({ path: 'user', select: '-password' }) // Exclude password
            .populate({ path: 'comments.user', select: '-password' }) // Exclude password from comment authors
            .lean(); // Return plain JavaScript objects for performance

        return res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching user posts:", error); // Log error for debugging
        return res.status(500).json({ error: "An error occurred while fetching posts" });
    }
};