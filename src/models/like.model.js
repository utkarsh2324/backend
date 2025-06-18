import mongoose,{Schema} from "mongoose";

const likeSchema= new Schema(
    {
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video"                                 //Video comes from mongoose.model("Video")inside bracket Video is user
        },
        comment:{
            type:Schema.Types.ObjectId,
            ref:"Comment"                                
        } ,
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Tweet"  
        },
        likedBy:{
            type:Schema.Types.ObjectId,
            ref:"User" 
        }
    },{
        timestamps:true
    }
)

export const Like=mongoose.model("Like",likeSchema)