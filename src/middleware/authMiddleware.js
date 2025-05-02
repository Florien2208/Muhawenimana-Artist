// middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not defined in .env file");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    console.error(`Error in protect middleware: ${error.message}`);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(401).json({ message: "Not authorized" });
  }
};


export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as admin" });
  }
};

/**
 * @desc    Moderator middleware - Check if user is moderator or admin
 * @middleware
 */
export const isModerator = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "moderator" || req.user.role === "admin")
  ) {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as moderator" });
  }
};
