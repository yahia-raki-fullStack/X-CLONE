import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to protect routes by verifying JWT and retrieving the authenticated user
export const protectRoute = async (req, res, next) => {
   try {
      // Retrieve token from cookies
      const token = req.cookies.jwt;
      if (!token) {
         return res.status(401).json({ 
            error: 'Access denied. No token provided, please login first.' 
         });
      }

      // Verify token and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded) {
         return res.status(401).json({ 
            error: 'Authentication failed. Invalid token.' 
         });
      }

      // Fetch user by ID from the decoded token, exclude password field
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
         return res.status(404).json({ 
            error: 'User not found. Authentication required.' 
         });
      }

      // Attach user to request object and proceed
      req.user = user;
      next();

   } catch (error) {
      console.error('Error in protectRoute middleware:', error.message);

      // General server error response
      res.status(500).json({ 
         error: 'An unexpected server error occurred. Please try again later.' 
      });
   }
};
