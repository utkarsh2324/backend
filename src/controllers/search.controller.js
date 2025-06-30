import {asynchandler} from "../utils/asynchandler.js"
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";



const search = asynchandler(async (req, res) => {
    const { q } = req.query;
  
    if (!q || q.trim() === "") {
        throw new apierror(
            400,
            "search query is required"
          );
    }
  
    const regex = new RegExp(q, "i"); // Case-insensitive match
  
    const users = await User.find({ fullName: regex }).select("fullName avatar _id userName");
    const videos = await Video.find({ title: regex }).select("title thumbnail _id");
  
    return res.status(200).json(
      new apiresponse(200, { users, videos }, "Search results fetched successfully")
    );
  });
  
export  {
    search
  };