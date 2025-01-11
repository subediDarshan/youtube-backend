import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // aggregate pipeline on Video model
    // add fields like total video views, total videos, total likes
    // aggregate pipeline on Subscription model
    // find total subscriber
    // merge these two in single object and return that

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    let videoStats = await Video.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "total_likes",
            },
        },
        {
            $addFields: {
                total_likes: { $size: "$total_likes" },
            },
        },
        {
            $group: {
                _id: "$owner",
                total_views: { $sum: "$views" },
                total_videos: { $sum: 1 },
                total_likes: { $sum: "$total_likes" },
            },
        },
        {
            $project: {
                _id: 0,
                total_views: 1,
                total_videos: 1,
                total_likes: 1,
            },
        },
    ]);

    if (videoStats && Array.isArray(videoStats) && videoStats.length == 1) {
        videoStats = videoStats[0];
    } else {
        throw new ApiError(500, "Problem fetching video stats");
    }

    let subscriptionStats = await Subscription.aggregate([
        {
            $match: {
                $or: [{ subscriber: userId }, { channel: userId }],
            },
        },
        {
            $group: {
                _id: null,
                total_subscriber: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$channel", userId] },
                            then: 1,
                            else: 0,
                        },
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total_subscriber: 1,
            },
        },
    ]);

    if (
        subscriptionStats &&
        Array.isArray(subscriptionStats) &&
        subscriptionStats.length == 1
    ) {
        subscriptionStats = subscriptionStats[0];
    } else {
        throw new ApiError(500, "Problem fetching subscription stats");
    }

    const result = {
        total_videos: videoStats?.total_videos,
        total_likes: videoStats?.total_likes,
        total_views: videoStats?.total_views,
        total_subscriber: subscriptionStats?.total_subscriber,
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, result, "Channel stats fetched successfully")
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    // aggregate pipeline on Video model
    // match owner and lookup for owner of video
    // also add field like count for each video

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "like_count",
            },
        },
        {
            $addFields: {
                like_count: { $size: "$like_count" },
            },
        },
    ]);

    if (videos && Array.isArray(videos) && videos.length == 1) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    videos,
                    "Channel videos fetched successfully"
                )
            );
    } else {
        throw new ApiError(500, "Problem fetching channel videos");
    }
});

export { getChannelStats, getChannelVideos };
