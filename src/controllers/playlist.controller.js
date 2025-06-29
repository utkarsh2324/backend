import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"


const createPlaylist = asynchandler(async (req, res) => {
    // Extract playlist details from request body
    const { name, description } = req.body;
  
    if (!name || !description) {
      throw new apierror(400, "Name and description are required");
    }
  
    const playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });
  
   
    if (!playlist) {
      throw new apierror(500, "Something went wrong while creating the playlist");
    }
  
   
    return res
      .status(201)
      .json(new apiresponse(201, playlist, "Playlist created successfully"));
  

  });
  
  const getUserPlaylists = asynchandler(async (req, res) => {
    
    const { userId } = req.params;
  
    
    if (!isValidObjectId(userId)) {
      throw new apierror(400, "Invalid user ID");
    }
  
   
    const playlists = await Playlist.find({ owner: userId }).populate({
        path: "videos",
        select: "_id title thumbnail",
      });;
  
    if (!playlists || playlists.length === 0) {
      throw new apierror(404, "Playlist not found");
    }
  
    return res
      .status(200)
      .json(
        new apiresponse(200, playlists, "User playlists fetched successfully")
      );

  });
  
  const getPlaylistById = asynchandler(async (req, res) => {
    // Extract playlistId from request parameters
    const { playlistId } = req.params;
  
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    const playlist = await Playlist.findById(playlistId).populate("videos");

    if (!playlist) {
      throw new apierror(404, "Playlist not found");
    }

    return res
      .status(200)
      .json(new apiresponse(200, playlist, "Playlist fetched successfully"));
  

  });
  
  const addVideoToPlaylist = asynchandler(async (req, res) => {
   
    const { playlistId, videoId } = req.params;
  
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new apierror(400, "Invalid playlist or video ID");
    }
  
    const updatedPlaylist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId), // Find the playlist by ID
        },
      },
      {
        $addFields: {
          videos: {
            $setUnion: ["$videos", [new mongoose.Types.ObjectId(videoId)]], // Ensure unique videos
          },
        },
      },
      {
        $merge: {
          into: "playlists", // Update the existing playlist collection
        },
      },
    ]);
  
    // If no update was made, return an error.
    if (!updatedPlaylist) {
      throw new apierror(404, "Playlist not found or video already added");
    }
  
   
    return res
      .status(200)
      .json(
        new apiresponse(
          200,
          updatedPlaylist,
          "Video added to playlist successfully"
        )
      );
  
    /*
  
   Adding a Video to a Playlist - Notes:
  
  👉 What does `$setUnion` do?
     - Ensures that the `videos` array only contains unique values.
     - If the video is already in the playlist, it won’t be added again.
     - Helps prevent duplicate entries.
  
  👉 How does `$merge` work?
     - Takes the modified playlist and updates the `playlists` collection.
     - If the document exists, it updates it.
     - If the document doesn’t exist, it creates a new one (though in this case, it’s always an update).
  
  👉 Alternative method using `findByIdAndUpdate`
     ```
     const updatedPlaylist = await Playlist.findByIdAndUpdate(
       playlistId,
       { $addToSet: { videos: videoId } }, // $addToSet ensures uniqueness
       { new: true }
     );
  
     ```
   */
  });
  
  const removeVideoFromPlaylist = asynchandler(async (req, res) => {
    // Extract playlistId and videoId from request parameters
    const { playlistId, videoId } = req.params;
  
    // Validate both IDs to make sure they're legit MongoDB ObjectIds
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new apierror(400, "Invalid playlist or video ID");
    }
  
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pull: {
          videos: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        new: true,
      }
    );
  
    // If no playlist is found, return a 404 error.
    if (!updatedPlaylist) {
      throw new apierror(404, "Playlist not found");
    }
  
    /*
       Success Response: 
      - Sends back the updated playlist.
    */
    return res
      .status(200)
      .json(
        new apiresponse(
          200,
          updatedPlaylist,
          "Video removed from playlist successfully"
        )
      );
  

  });
  
  const deletePlaylist = asynchandler(async (req, res) => {
    // Extract playlistId from request parameters
    const { playlistId } = req.params;
  
    // Validate if playlistId is a valid MongoDB ObjectId
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    /*
      Delete the playlist from the database using findByIdAndDelete.
      - If the playlist exists, it will be removed from the database.
    */
    const deletedPlaylistDoc = await Playlist.findByIdAndDelete(playlistId);
  
    // If no playlist is found, return a 404 error.
    if (!deletedPlaylistDoc) {
      throw new apierror(404, "Playlist not found");
    }
  
    /*
      Send a success response with the deleted playlist details.
      - The response includes the deleted playlist's data.
    */
    return res
      .status(200)
      .json(
        new apiresponse(200, deletedPlaylistDoc, "Playlist deleted successfully")
      );
  
  });
  
  const updatePlaylist = asynchandler(async (req, res) => {
 
    const { playlistId } = req.params;
    const { name, description } = req.body;
  
    //  Step 1: Validate the playlist ID
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    //  Step 2: Ensure name and description are provided
    if (!name || !description) {
      throw new apierror(400, "Name or description cannot be empty");
    }
  
   
    const updatedPlaylistDoc = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: {
          name,
          description,
        },
      },
      {
        new: true,
      }
    );
  
    if (!updatedPlaylistDoc) {
      throw new apierror(404, "Playlist not found");
    }
  
    return res
      .status(200)
      .json(
        new apiresponse(200, updatedPlaylistDoc, "Playlist updated successfully")
      );
  
 
  });
  
  export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
  };

