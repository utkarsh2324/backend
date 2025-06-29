import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"

const toggleVideoLike = asynchandler(async (req, res) => {
    // Extract videoId from request parameters (The ID of the video that the user wants to like/unlike)
    const { videoId } = req.params;
  
    // Get the userId of the currently authenticated user
    const userId = req.user._id;
  
    // Validate if videoId is a proper MongoDB ObjectId
    if (!isValidObjectId(videoId)) {
      throw new apierror(400, "Invalid video ID");
    }
  
    /*
       Check if the User Already Liked the Video:
        - This checks if there's already a like from this user on this video.
    */
    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: userId,
    });
  
    /*
       Toggle Like Logic:
      - If the user already liked the video, remove the like (Unlike it).
      - If the user hasn't liked it yet, create a new like (Like it).
    */
    if (existingLike) {
      // Remove the existing like
      await Like.findByIdAndDelete(existingLike._id);
      return res
        .status(200)
        .json(new apiresponse(200, existingLike, "Video unliked successfully"));
    }
  
    // If no like exists, create a new like
    const likeVideo = await Like.create({
      video: videoId,
      likedBy: userId,
    });
  
    return res
      .status(201)
      .json(new apiresponse(201, likeVideo, "Video liked successfully"));
  
   
  });
  
 
  
  const toggleTweetLike = asynchandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;
  
    if (!isValidObjectId(tweetId)) {
      throw new apierror(400, "Invalid tweet ID");
    }
  
    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });
  
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
  
      const totalLikes = await Like.countDocuments({ tweet: tweetId });
  
      return res.status(200).json(
        new apiresponse(200, {
          tweetId,
          liked: false,
          totalLikes,
        }, "Tweet unliked successfully")
      );
    }
  
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
  
    const totalLikes = await Like.countDocuments({ tweet: tweetId });
  
    return res.status(201).json(
      new apiresponse(201, {
        tweetId,
        liked: true,
        totalLikes,
      }, "Tweet liked successfully")
    );
  });
   const getLikedVideos = asynchandler(async (req, res) => {
    try {
      const userId = req.user._id;
  
      if (!userId) {
        throw new apierror(401, "User not authenticated");
      }
  
      const likedVideos = await Like.find({
        likedBy: userId,
        video: { $ne: null },
      })
        .populate({
          path: "video",
          populate: {
            path: "owner",
            select: "fullName avatar",
          },
          select: "_id title videoFile thumbnail createdAt view",
        });
  
      // Filter out likes with null video (in case deleted)
      const validVideos = likedVideos
        .map((like) => like.video)
        .filter((video) => video !== null);
  
      return res.status(200).json(
        new apiresponse(200, validVideos, "Liked videos fetched successfully")
      );
    } catch (error) {
      
      throw new apierror(500, "Failed to fetch liked videos");
    }
  });

export {
    
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}