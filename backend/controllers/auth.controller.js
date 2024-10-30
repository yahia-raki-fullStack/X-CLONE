import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js"
import User from "../models/user.model.js"
import bcrypt from 'bcryptjs'
export const signup = async (req, res) => {
  try {
      // Destructure user details from the request body
      const { fullName, username, email, password } = req.body;

      // Validate that required fields are present
      if (!fullName || !username || !email || !password) {
          return res.status(400).json({ error: 'All fields are required' });
      }

      // Email format validation using regex
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if the username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
          return res.status(400).json({ error: 'Username exists, please choose another' });
      }

      // Check if the email is already registered
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
          return res.status(400).json({ error: 'Email exists, please log in' });
      }
      if (password.length < 8) {
        return res.status(400).json({error:'password must me longer then 8 characters'})
      }
      // Generate a salt and hash the password for security
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create a new user with hashed password and other details
      const newUser = new User({
          fullName,
          username,
          email,
          password: hashedPassword
      });

      if (newUser) {
          // Save the new user to the database
          await newUser.save();

          // Generate and set authentication token as a cookie
          generateTokenAndSetCookie(newUser._id, res);

          // Respond with the user's data
          res.status(201).json({
              _id: newUser._id,
              fullName: newUser.fullName,
              username: newUser.username,
              email: newUser.email,
              followers: newUser.followers, 
              following: newUser.following,
              profileImg: newUser.profileImg,
              coverImg: newUser.coverImg
          });
      } else {
          // If user creation failed, respond with an error
          res.status(400).json({ error: 'Invalid user data' });
      }
  } catch (error) {
      // Handle any unexpected server errors
      res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Wrong username' });
        }

        // Compare provided password with stored hashed password
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || '');
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Wrong password' });
        }

        // Generate and set the token if authentication is successful
        generateTokenAndSetCookie(user._id, res);

        // Respond with success message and user data
        return res.status(200).json({
            _id: user._id,
              fullName: user.fullName,
              username: user.username,
              email: user.email,
              followers: user.followers, 
              following: user.following,
              profileImg: user.profileImg,
              coverImg: user.coverImg
        });
    } catch (error) {
        // Handle server errors
        return res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
export const logout = async (req, res) => {
    try {
        // Clear the JWT cookie by setting an expired maxAge
        res.cookie('jwt', '', { maxAge: 0 });
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Error in logout function:', error.message);
        return res.status(500).json({ 
            error: 'An error occurred while logging out. Please try again later.' 
        });
    }
};

export const getMe = async (req, res) => {
    try {
        // Retrieve the authenticated user's data from the database, excluding password field
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found. Please ensure you are logged in.' 
            });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error in getMe function:', error.message);
        return res.status(500).json({ 
            error: 'An error occurred while retrieving user information. Please try again later.' 
        });
    }
};
