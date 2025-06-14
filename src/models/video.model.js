import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema=new Schema({
    videFile:{
        type:String, //cloudnary url
        required:true,
    },
    thumbnail:{
        type:String, //cloudnary url
        required:true,
    },
    title:{
        type:String, 
        required:true,
    },
    description:{
        type:String, 
        required:true,
    },
    thumbnail:{
        type:Number,
        required:true,
    },
    view:{
        type:Number,
        default:0
    },
    ispublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{
    timestamps:true
}) 

videoSchema.plugin(mongooseAggregatePaginate)   //for aggregation queries and pipeline
export const Video=mongoose.model(Video, videoSchema)