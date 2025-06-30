import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideospublic = asynchandler(async (req, res) => {
  const videos = await Video.find().populate('owner', 'fullName avatar email');
  res.status(200).json(new apiresponse(200, videos, 'Videos fetched successfully'));
});
const getAllVideos = asynchandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if (!req.user) {
        throw new apierror(401, "User needs to be logged in");
    }
     // Constructing the match object to filter videos
  const match = {
    ...(query ? { title: { $regex: query, $options: "i" } } : {}), // If query exists, match titles that contain the search term (case-insensitive)
    ...(userId ? { owner:new mongoose.Types.ObjectId(userId) } : {}), // If userId exists, filter videos by that owner
  };

  const videos = await Video.aggregate([
    {
      $match: match, // Filtering videos based on the match criteria
    },

    {
      /*
        $lookup: Joins data from the "users" collection
        - Fetches user details based on the "owner" field in the videos collection
        - This allows us to include user information with each video
      */
      $lookup: {
        from: "users", // Collection to join with
        localField: "owner", // Matching "owner" field in the videos collection
        foreignField: "_id", // Matching "_id" field in the users collection
        as: "videosByOwner", // The resulting user data will be stored under "videosByOwner"
      },
    },

    {
      /*
        $project: Selecting only the necessary fields to return in the response

      */
      $project: {
        videoFile: 1, // Video file link
        thumbnail: 1, // Thumbnail image link
        title: 1, // Video title
        description: 1, // Video description
        duration: 1, // Video duration
        views: 1, // Number of views
        isPublished: 1, // Whether the video is published or not
        owner: {
          $arrayElemAt: ["$videosByOwner", 0], // Extracts the first user object from the array
        },
      },
    },

    {
      /*
        $sort: Sorting videos based on the specified field
        - If sortType is "desc", sort in descending order (-1)
        - If sortType is "asc", sort in ascending order (1)
      */
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },

    {
      /*
        $skip: Skipping records for pagination
        - Formula: (page number - 1) * limit
        - If page = 2 and limit = 10, skips (2-1) * 10 = 10 records
      */
      $skip: (page - 1) * parseInt(limit),
    },

    {
      /*
        $limit: Limits the number of results per page
        - Ensures that the number of results does not exceed the "limit" value
      */
      $limit: parseInt(limit),
    },
  ]);

  // If no videos are found, throw an error
  if (!videos?.length) {
    throw new apierror(404, "Videos are not found");
  }

  // Sending the response with a success message
  return res
    .status(200)
    .json(new apiresponse(200, videos, "Videos fetched successfully"));
    
})

const publishAVideo = asynchandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

  // Validate that the title is not empty
  if (!title) {
    throw new apierror(400, "Title should not be empty");
  }
  // Validate that the description is not empty
  if (!description) {
    throw new apierror(400, "Description should not be empty");
  }

  // Extract the video file path from the uploaded files
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  if (!videoFileLocalPath) {
    throw new apierror(400, "Video file is required");
  }

  // Extract the thumbnail file path from the uploaded files
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new apierror(400, "Thumbnail is required");
  }

  try {
    

    // Upload the video file to Cloudinary and get the URL
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    if (!videoFile) {
      throw new apierror(400, "Cloudinary Error: Video file is required");
    }

    // Upload the thumbnail image to Cloudinary and get the URL
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new apierror(400, "Cloudinary Error: Thumbnail is required");
    }

    // Store video details in the database
    const videoDoc = await Video.create({
      videoFile: videoFile.url, // Cloudinary URL of the video file
      thumbnail: thumbnail.url, // Cloudinary URL of the thumbnail
      title,
      description,
      owner: req.user?._id, // ID of the user who uploaded the video
     // Duration of the video (in seconds)
    });

    console.log(` Title: ${title}, Owner: ${req.user?._id}`);

    // If video creation fails, throw an error
    if (!videoDoc) {
      throw new apierror(500, "Something went wrong while publishing a video");
    }

    // Send a success response with the video details
    return res
      .status(201)
      .json(new apiresponse(201, videoDoc, "Video published Successfully"));
  } catch (error) {
    // Handle errors and send a 500 response if something goes wrong
    throw new apierror(500, error);
  }
})

const getVideoById = asynchandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }

  // ✅ Increment view count by 1
  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { view: 1 } },
    { new: true }
  ).populate("owner", "fullName userName email avatar");

  if (!video) {
    throw new apierror(404, "Video not found");
  }

  // ✅ Count likes
  const likeCount = await Like.countDocuments({ video: videoId });

  // ✅ Check if current user liked this video
  let isLikedByCurrentUser = false;
  if (req.user && req.user._id) {
    const liked = await Like.findOne({
      video: videoId,
      likedBy: req.user._id,
    });
    isLikedByCurrentUser = !!liked;
  }

  // ✅ Prepare response with like and view info
  const videoData = {
    ...video.toObject(),
    likeCount,
    isLikedByCurrentUser,
  };

  return res
    .status(200)
    .json(new apiresponse(200, videoData, "Video fetched successfully"));
});

const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;

  // Validate if the provided videoId is a valid MongoDB ObjectId
  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }

  // Create an object to hold updateData for updating title, description and thumbnail(thumbnail will be appended later)
  let updateData = { title, description };

  /*
    If a new thumbnail is uploaded:
    - Extract the file path from request.
    - Ensure the file path is valid.
    - Upload the file to Cloudinary.
    - If the upload is successful, update the thumbnail URL.
  */
  if (req.file) {
    const thumbnailLocalPath = req.file.path;

    if (!thumbnailLocalPath) {
      throw new apierror(400, "Thumbnail file is missing");
    }

    // Upload the thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
      throw new apierror(400, "Error while uploading thumbnail");
    }

    // Add the new thumbnail URL to the updateData
    updateData.thumbnail = thumbnail.url;
  }

  /*
    Update the video document in the database:
    - `findByIdAndUpdate` searches for the video by its ID.
    - `$set: updateData` updates only the provided fields.
    - `{ new: true, runValidators: true }`
      - `new: true` returns the updated document instead of the old one.
      - `runValidators: true` ensures data validation rules are applied.
  */
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // If the video is not found, return error.
  if (!updatedVideo) {
    throw new apierror(404, "Video not found");
  }

  // Send a success response with the updated video details.
  return res
    .status(200)
    .json(new apiresponse(200, updatedVideo, "Video updated successfully"));

})

const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
      }
    
      /*
            Delete the video from the database.
        - `findByIdAndDelete(videoId)`: Finds a video by its ID and removes it.
        - If the video does not exist, `deletedVideo` will be null.
      */
      const deletedVideo = await Video.findByIdAndDelete(videoId);
    
      // If no video was found to delete, return a 404 error.
      if (!deletedVideo) {
        throw new apierror(404, "Video not found");
      }
    
      // Send a success response with the deleted video details.
      return res
        .status(200)
        .json(new apiresponse(200, deletedVideo, "Video deleted successfully"));
})
/*
const togglePublishStatus = asynchandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
      }
    
      /*
        Find the video by its ID.
        - `findById(videoId)`: Fetches the video document if it exists.
        - If the video is not found, we throw a 404 error.
      */
     // const video = await Video.findById(videoId);
    
    /*  if (!video) {
        throw new apierror(404, "Video not found");
      }
    
      /*
        Toggle the `isPublished` status of the video.
        - If it's `true`, set it to `false`.
        - If it's `false`, set it to `true`.
      */
     /* video.isPublished = !video.isPublished;
    
      // Save the updated video status in the database.
      await video.save();
    
      /*
        Send a success response with the updated video details.
        - `video` contains the updated publish status.
      */
     /* return res
        .status(200)
        .json(
          new apiresponse(200, video, "Video publish status toggled successfully")
        );
    
})*/

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
   getAllVideospublic
}