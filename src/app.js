import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();
app.use(cors({
    origin:process.env.cors_origin,
    credentials:true
}))
//for middleware we use app.use
app.use(express.json({limit:"20kb "}))
app.use(express.urlencoded({
    extended:true,limit:"16kb"
}))

//for cookies
app.use(cookieParser())



export default app;