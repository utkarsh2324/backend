//require('dotenv').config({path:'./ env'})
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path:"./env"
})
connectDB()







 



/*import DB_NAME from "./constants";
import express from "express";
const app=express()

(async()=>{
    try {

       await  mongoose.connect('${process.env.mongodb_url}/${DB_NAMEn}')
       app.on("error",(error)=>{
        console.log("Can't talk to database",error);
        throw error
       })

       app.listen(process.env.port,()=>{
        console.log("App is running on:${process.env.port}")
       })
    } catch (error) {
        console.log("Error",error)
        throw error
    }
})()  */ 