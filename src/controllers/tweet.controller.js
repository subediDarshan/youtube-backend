import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    const { content } = req.body;

    const tweet = await Tweet.create({
        content,
        owner: userId,
    });

    if (tweet) {
        return res
            .status(200)
            .json(new ApiResponse(200, tweet, "Tweet created successfully"));
    } else {
        throw new ApiError(500, "Problem creating tweet");
    }
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    // aggregate pipeline on Tweet model
    // match owner with current user
    // lookup for owner from User model

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    const userTweets = await Tweet.aggregate([
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
            },
        },
        {
            $unwind: "$owner",
        },
    ]);

    if (userTweets && Array.isArray(userTweets)) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    userTweets,
                    "User tweets fetched successfully"
                )
            );
    } else {
        throw new ApiError(500, "Problem fetching user tweets");
    }
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    // take new content and update
    let { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        tweetId = mongoose.Types.ObjectId.createFromHexString(tweetId);
    }

    const result = await Tweet.updateOne(
        { _id: tweetId },
        {
            $set: { content },
        }
    );

    if (result.matchedCount > 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet updated successfully"));
    } else {
        throw new ApiError(500, "Problem updating tweet");
    }
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        tweetId = mongoose.Types.ObjectId.createFromHexString(tweetId);
    }

    const result = await Tweet.deleteOne({ _id: tweetId });

    if ((result.deletedCount = 1)) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
    } else {
        throw new ApiError(500, "Problem deleting tweet");
    }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
