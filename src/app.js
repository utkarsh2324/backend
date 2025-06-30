import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();
app.use(cors({
    origin:process.env.cors_origin,
    credentials:true
}))
//for middleware we use app.use
app.use(express.json({limit:"500mb "}))
app.use(express.urlencoded({
    extended:true,limit:"500mb"
}))
app.use(express.static("public")); 
//for cookies
app.use(cookieParser())


// for routes
import userRouter from "./routes/user.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import commentRouter from "./routes/comment.routes.js"
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import searchRouter from "./routes/search.routes.js";

//Routes Declaration
app.use("/api/v1/users",userRouter)                       //http:localhost:8000/api/v1/users/register (from user.routes.js file)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/search", searchRouter);
export default app;