import { asynchandler } from "../uitls/asynchandler.js";
import { apierror } from "../uitls/apierror.js";
import validator from "validator";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../uitls/cloudinary.js";
import { apiresponse } from "../uitls/apiresponse.js";

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



    //express by default give req.body
    const {fullName ,email , userName, password}=req.body
    //console.log("email:",email);
    if( 
        [fullName,email,userName,password].some((field)=>
            field?.trim()===" "
        )
    ){
        throw new apierror(400,"All fields are required")
    }
    if(!validator.isEmail(email)){
        throw new apierror(409,"Invalid email format")
    }
   const existedUser= await User.findOne({
        $or:[{ userName },{ email }]
    })
    if(existedUser){
        throw new apierror(409,"User already exist ")
    }
    //to get url of avatar and images we use multer bcoz multer give by default req.files

   // console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){                         //isArray check krta hai properly aya hai ya nhi 
        coverImageLocalPath=req.files.coverImage[0].path
    }



    if(!avatarLocalPath){
        throw new apierror(400,"Avatar is required")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath) 
    const coverImage= await uploadOnCloudinary(coverImageLocalPath) 





    if(!avatar){
    throw new apierror(400,"Avatar is required")
    }

   const user=await  User.create ({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new apierror(500,"Something went wrong while registering user")
   }


   return res.status(201).json(
    new apiresponse(200,createdUser,"User registerd successfully")
   )

})
    


export {registerUser}  