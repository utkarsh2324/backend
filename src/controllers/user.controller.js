import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import validator from "validator";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiresponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

//generating a generalised method so we dont have to write everytime
const generateAccessTokenAndRefreshToken=async(userId)=>{      
    try {
        const user=await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })    //We are doing this because if we try to save mongoose model will get kickin  so password field will also be kickin so whenever we will save this you required password but we are only giving user token

        return {accessToken,refreshToken}
        

    } catch (error) {
        throw new apierror(500,"Something went wrong while generating refresh and access token")
    }
}

//registering a user
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

//login a user
const loginUser=asynchandler(async(req,res)=>{
    //get data from req body
    //userName or email
    //find user
    //password check
    //access and refresh token generated and give to user
    //send secure cookie

    const {email,userName ,password}=req.body
    if(!userName && !email){
        throw new apierror (400,"username or email is required")
    }

   const user= await User.findOne({
        $or: [{email},{userName}]
    })
    if(!user){
        throw new apierror(404,"User does not exist")
    }
    
   const isPasswordValid= await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new apierror(401,"Invalid User Credentials")
    }

   const{accessToken,refreshToken}= await generateAccessTokenAndRefreshToken(user._id)

   const loggedinUser=await User.findById(user._id).
   select("-password  -refreshToken")

   const options={    // we are doing this because from frontend anyone can change the cookies so it will make sure only it will be changed by server
    httpOnly:true,
    secure:true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken)
   .json(
    new apiresponse(200,{
        user:loggedinUser,accessToken,refreshToken
    },
    "User Logged in successfully"
)
   )
})

//loggedout a user
const loggedOutUser=asynchandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,{
            $set:{                                      //set is a Operator 
                refreshToken:undefined
            }
        },
        {
        new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
       }
    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new apiresponse(200,{},"User logged out successfully"))
})
    
//refresh access token 
const refreshAccessToken=asynchandler(async(req,res)=>{
   const incomingRefreshToken=  req.cookie.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new apierror(401,"Unauthorized Request")
   }

   try {
    const decodedToken =jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
    )
 
    const user =await User.findById(decodedToken?._id)
    if(!user){
     throw new apierror(401,"Invalid refresh token")
    }
 //checking if incomingrefreshtoken and the refeshToken save in db is same or not
    if(incomingRefreshToken !== user?.refreshToken){
     throw new apierror(401,"Refresh token is expired or used")
    }
 
    const options={
     httpOnly:true,
     secure:true
    }
     const{ accessToken,newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
 
    return res
    .status(200)
    .cookie("accessToke",accessToken,options)
    .cookie("refeshToken",newRefreshToken,options)
    .json(
     new apiresponse(
          200,
          {accessToken,refreshToken:newRefreshToken  },
          "Access Token refreshed"
     )
    )
   } catch (error) {
        throw new apierror(401,error?.message||"Invalid refresh token")
   }
})

//changing old password
const changeCurrentPassword=asynchandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

   const user =await   User.findById(req.user?._id) 
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apierror(400,"Invalid password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new apiresponse(
        200,{},
        "Password changed successfully"
    ))

})

//get current user
const getCurrentUser=asynchandler(async(req,res)=>{
    return res
    .status(200)
    .json(new apiresponse(200,req.user,"Current User fetch successfully"))
})

//updating account
const updateAccountDetails=asynchandler(async(req,res)=>{
        const {fullName,email}=req.body
        if(!(fullName || email)){
            throw new apierror(400,"All field are required")
        }

        const user= await User.findByIdAndUpdate(req.user?._id,
            {
                $set:{
                    fullName:fullName,
                    email:email
                }
            },
            {new :true}                 //The information will be made available once the update is completed
        ).select("-password")

        return res
        .status(200)
        .json(new apiresponse(200,user,"Account details updated successfullt"))
})

//updating user Avataer
const updateUserAvatar=asynchandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path  
    if(!avatarLocalPath){
        throw new apierror(400,"Avatar file is missing")                    //get through multer middleware
    }           
    const avatar=  await uploadOnCloudinary(avatarLocalPath)   
    if(!avatar.url){
        throw new apierror(400,"Error while upload on avatar")
    }
   const user= await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiresponse(
        200,
        user,
        "Avatar changed successfully"
    ))
    
})

//update user CoverImage
const updateUserCoverImage=asynchandler(async(req,res)=>{
    const coverLocalPath=req.file?.path  
    if(!coverLocalPath){
        throw new apierror(400,"Cover Image file is missing")                    //get through multer middleware
    }           
    const coverImage=  await uploadOnCloudinary(coverLocalPath)   
    if(!coverImage.url){
        throw new apierror(400,"Error while upload on cover image")
    }
   const user= await User.findByIdAndUpdate(req.user?._id,
        { 
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiresponse( 
        200,
        user,
        "Cover Image changed successfully"
    ))
    
})

//get user channel profile like how many subscriber and whom you follow
const getUserChannelProfile = asynchandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new apierror(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                userName:username.toLowerCase()
              }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new apierror(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new apiresponse(200, channel[0], "User channel fetched successfully")
    )
})

// controllers/userController.js or watchController.js
const addToWatchHistory = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;
  
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new apierror(400, 'Invalid video ID');
    }
  
    await User.findByIdAndUpdate(userId, {
      $addToSet: { watchHistory: videoId }, // prevents duplicates
    });
  
    return res.status(200).json(new apiresponse(200, {}, 'Added to watch history'));
  });
//watch history of user 
const watchHistory = asynchandler(async (req, res) => {
    const userId = req.user._id;
  
    const user = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  { $project: { fullName: 1, username: 1, avatar: 1 } },
                ],
              },
            },
            { $addFields: { owner: { $first: "$owner" } } },
            { $sort: { createdAt: -1 } }, // newest watched first
          ],
        },
      },
      { $project: { watchHistory: 1 } },
    ]);
  
    return res.status(200).json(
      new apiresponse(
        200,
        user[0]?.watchHistory || [],
        "Watch history fetched successfully"
      )
    );
  });

export {registerUser,loginUser,loggedOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,
    getUserChannelProfile,watchHistory,addToWatchHistory
}   