// routes/user.routes.js
import express from "express";
import {
registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controller/auth.controller.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";


const authRouter = express.Router();

// Public routes
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);

// Protected routes
authRouter
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Admin routes
authRouter.route("/").get(protect, isAdmin, getUsers);

authRouter
  .route("/:id")
  .get(protect, isAdmin, getUserById)
  .put(protect, isAdmin, updateUser)
  .delete(protect, isAdmin, deleteUser);

export default authRouter;
