import express from "express";
import authRouter from "./auth.routes.js";
import MusicRouter from "./music.routes.js";

const appRouter = express.Router();

appRouter.use("/auth", authRouter);
appRouter.use("/music", MusicRouter);

export default appRouter;
