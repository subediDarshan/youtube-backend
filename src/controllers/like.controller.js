import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  let { videoId } = req.params;
  //TODO: toggle like on video
  // search in like collection for likedBy field as req.user._id and video field as videoId
  // if found delete tha document
  // if not found add a document

  let userId = req?.user?._id;
  if (!isValidObjectId(userId)) {
    userId = mongoose.Types.ObjectId.createFromHexString(userId);
  }
  if (!isValidObjectId(videoId)) {
    videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
  }

  const like = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        video: videoId,
      },
    },
  ]);

  if (like && like.length > 0) {
    try {
      const likeId = like[0]._id;
      await Like.deleteOne({
        _id: likeId,
      });

      return res.status(200).json(new ApiResponse(200, {}, "Video Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while liking video");
    }
  } else {
    try {
      const likeDoc = await Like.create({
        video: videoId,
        likedBy: userId,
      });
      return res.status(201).json(new ApiResponse(201, likeDoc, "Video Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while disliking video");
    }
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  let { commentId } = req.params;
  //TODO: toggle like on comment

  let userId = req?.user?._id;
  if (!isValidObjectId(userId)) {
    userId = mongoose.Types.ObjectId.createFromHexString(userId);
  }
  if (!isValidObjectId(commentId)) {
    commentId = mongoose.Types.ObjectId.createFromHexString(commentId);
  }

  const like = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        comment: commentId,
      },
    },
  ]);

  if (like && like.length > 0) {
    try {
      const likeId = like[0]._id;
      await Like.deleteOne({
        _id: likeId,
      });

      return res.status(200).json(new ApiResponse(200, {}, "Comment Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while liking comment");
    }
  } else {
    try {
      const likeDoc = await Like.create({
        comment: commentId,
        likedBy: userId,
      });
      return res
        .status(201)
        .json(new ApiResponse(201, likeDoc, "Comment Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while disliking comment");
    }
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  let { tweetId } = req.params;
  //TODO: toggle like on tweet

  let userId = req?.user?._id;
  if (!isValidObjectId(userId)) {
    userId = mongoose.Types.ObjectId.createFromHexString(userId);
  }
  if (!isValidObjectId(tweetId)) {
    tweetId = mongoose.Types.ObjectId.createFromHexString(tweetId);
  }

  const like = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        tweet: tweetId,
      },
    },
  ]);

  if (like && like.length > 0) {
    try {
      const likeId = like[0]._id;
      await Like.deleteOne({
        _id: likeId,
      });

      return res.status(200).json(new ApiResponse(200, {}, "Tweet Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while liking tweet");
    }
  } else {
    try {
      const likeDoc = await Like.create({
        tweet: tweetId,
        likedBy: userId,
      });
      return res.status(201).json(new ApiResponse(201, likeDoc, "Tweet Liked"));
    } catch (error) {
      throw new ApiError(500, "Problem occured while disliking tweet");
    }
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  //find current user id
  //match all like documents where likedBy equals current user id
  //and match only those documents having non empty video field

  let userId = req?.user?._id;
  if (!isValidObjectId(userId)) {
    userId = mongoose.Types.ObjectId.createFromHexString(userId);
  }

  const result = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        video: {
          $exists: true,
          $ne: null,
        },
      },
    },
    {
      $group: {
        _id: "$likedBy",
        likedVideos: { $push: "$video" },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "likedVideos",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
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
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (result && result.length > 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result[0].likedVideos,
          "Liked Videos fetched successfully"
        )
      );
  } else {
    throw new ApiError(500, "Problem while fetching liked videos");
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
