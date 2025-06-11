import { asynchandler } from "../uitls/asynchandler.js";
import { apierror } from "../uitls/apierror.js";
import validator from "validator";

const registerUser=asynchandler(   async(req,res)=>{
    //get details from user
    //validation like email is correct or not and non-empty
    //check if user already exist:userName,email
    //check for images ,check for avatar
    //upload them to cloudinary,avatar
    //create user object for uploading in Mongoose db-create entry in db
    //remove password and refresh token field
    //check for user creation
    //return res
    const {fullName ,email , userName, password}=req.body
    console.log("email:",email);
    if(
        [fullName,email,userName,password].some((field)=>
            field?.trim()===" "
        )
    ){
        throw new apierror(400,"All fields are required")
    }
    if(!validator.isEmail(email)){
        throw new apierror(400,"Invalid email format");
    }
})


export {registerUser}  