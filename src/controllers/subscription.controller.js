import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    let { channelId } = req.params;
    // TODO: toggle subscription
    // aggregate pipeline in Subscription model
    // match channel as channelId and subscriber as current user
    // if found then delete that document
    // if not found add that document

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }
    if (!isValidObjectId(channelId)) {
        channelId = mongoose.Types.ObjectId.createFromHexString(channelId);
    }

    const isSubscribed = await Subscription.aggregate([
        {
            $match: {
                channel: channelId,
                subscriber: userId,
            },
        },
    ]);

    if (isSubscribed && Array.isArray(isSubscribed)) {
        if (isSubscribed.length == 1) {
            //unsubscribe
            let subscriptionId = isSubscribed[0]._id;
            if (!isValidObjectId(subscriptionId)) {
                subscriptionId =
                    mongoose.Types.ObjectId.createFromHexString(subscriptionId);
            }
            const result = await Subscription.deleteOne({
                _id: subscriptionId,
            });
            if (result.deletedCount == 1) {
                return res
                    .status(200)
                    .json(new ApiResponse(200, {}, "Unsubcribed successfully"));
            } else {
                throw new ApiError(500, "Problem unsubcribing");
            }
        } else if (isSubscribed.length == 0) {
            //subscribe
            const subscribe = await Subscription.create({
                subscriber: userId,
                channel: channelId,
            });
            if (subscribe) {
                return res
                    .status(200)
                    .json(new ApiResponse(200, {}, "Subcribed successfully"));
            } else {
                throw new ApiError(500, "Problem subscribing");
            }
        } else {
            throw new ApiError(500, "Problem toggling subscription");
        }
    } else {
        throw new ApiError(500, "Problem toggling subscription");
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    let { channelId } = req.params;
    // aggregate pipeline on Subscription model
    // match channelId with channel
    // lookup subsciber from User models
    // group wrt channel
    // addField subscribers and push every subsciber to it

    if (!isValidObjectId(channelId)) {
        channelId = mongoose.Types.ObjectId.createFromHexString(channelId);
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: channelId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $group: {
                _id: "$channel",
                subscribers: { $push: "$subscriber" },
            },
        },
        {
            $project: {
                _id: 0,
                subscribers: 1,
            },
        },
    ]);

    if (subscribers && Array.isArray(subscribers)) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    subscribers,
                    "Subscribers fetched successfully"
                )
            );
    } else {
        throw new ApiError(500, "Problem finding subscribers");
    }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    // simimlar to above
    // match subscriberId with subscriber instead

    if (!isValidObjectId(subscriberId)) {
        subscriberId =
            mongoose.Types.ObjectId.createFromHexString(subscriberId);
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: subscriberId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
            },
        },
        {
            $unwind: "$channel",
        },
        {
            $group: {
                _id: "$subscriber",
                channels: { $push: "$channel" },
            },
        },
        {
            $project: {
                _id: 0,
                channels: 1,
            },
        },
    ]);

    if (subscribedChannels && Array.isArray(subscribedChannels)) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    subscribedChannels,
                    "Subscribed channels fetched successfully"
                )
            );
    } else {
        throw new ApiError(500, "Problem finding subscribed channels");
    }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
