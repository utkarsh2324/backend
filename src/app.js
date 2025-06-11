import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();
app.use(cors({
    origin:process.env.cors_origin,
    credentials:true
}))
//for middleware we use app.use
app.use(express.json({limit:"50mb "}))
app.use(express.urlencoded({
    extended:true,limit:"50mb"
}))
app.use(express.static("public")); 
//for cookies
app.use(cookieParser())


// for routes
import userRouter from "./routes/user.routes.js"


//Routes Declaration
app.use("/api/v1/users",userRouter)                       //http:localhost:8000/api/v1/users/register (from user.routes.js file)

export default app;