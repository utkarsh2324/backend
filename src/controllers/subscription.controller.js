import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscriptions.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"


const toggleSubscription = asynchandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const subscriberId = req.user._id;
    if (!isValidObjectId(channelId)) {
      throw new apierror(400, "Invalid channel ID");
    }
    
    
      /*
        Prevent Self-Subscription:
        - A user shouldn't be able to subscribe to their own channel.
        - Convert IDs to strings before comparing (MongoDB IDs are objects).
      */
      if (subscriberId.toString() === channelId.toString()) {
        throw new apierror(400, "You cannot subscribe to your own channel");
      }
    
      /*
         Check if Subscription Already Exists:
          - This looks for an existing record where the user is subscribed to the channel.
      */
      const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
      });
   
      if (existingSubscription) {
        // Remove the existing subscription (unsubscribe)
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
          .status(200)
          .json(new apiresponse(200, {}, "Unsubscribed successfully"));
      }
    
      // If no subscription exists, create a new one (subscribe)
      await Subscription.create({ subscriber: subscriberId, channel: channelId });
      return res
        .status(201)
        .json(new apiresponse(201, {}, "Subscribed successfully"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asynchandler(async (req, res) => {
  const channelId=req.user._id
  if(!isValidObjectId(channelId)){
    throw new apierror(400,"Invalid Channel Id")
  }

  const subscriberDoc=await Subscription.find(
    {
        channel:channelId
    }
  ).populate("subscriber","_id name email")
  
  if (!subscriberDoc) {
    throw new apierror(404, "No subscribers found for this channel");
  }

  return res.status(201)
  .json(new apiresponse(201,subscriberDoc,"Subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asynchandler(async (req, res) => {
    const subscriberId = req.user._id;
    const subscriberChannel=await Subscription.find(
        {
            subscriber:subscriberId
        }
    ).populate("channel","_id name email avatar userName fullName")

    if(!subscriberChannel || subscriberChannel.length===0){
        throw new apierror(404,"No subscribed channel found")
    }
    return res
    .status(201)
    .json(new apiresponse(201,subscriberChannel,"Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}