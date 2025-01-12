import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    let { videoId } = req.params;
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: videoId,
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
        // sorting and pagination
        {
            $sort: {
                [sortBy]: sortType == "asc" ? 1 : -1,
            },
        },
        {
            $skip: (parseInt(page) - 1) * parseInt(limit),
        },
        {
            $limit: parseInt(limit),
        },
        {
            $project: {
                content: 1,
                owner: 1,
                video: 0,
            },
        },
    ]);

    if (comments && Array.isArray(comments)) {
        if (comments.length > 0) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        comments,
                        "Comments fetched successfully"
                    )
                );
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, [], "No comments found"));
        }
    } else {
        throw new ApiError(500, "Problem finding comments");
    }
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    let { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    let { userId } = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    const { content } = req.body;

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
    });

    if (comment) {
        return res
            .status(201)
            .json(
                new ApiResponse(201, comment, "Comment created successfully")
            );
    } else {
        throw new ApiError(500, "Problem creating comment");
    }
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    let { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        commentId = mongoose.Types.ObjectId.createFromHexString(commentId);
    }

    const { content } = req.body;

    const updatedComment = await Comment.updateOne(
        { _id: commentId },
        {
            $set: { content },
        }
    );

    if (updatedComment.matchedCount > 0) {
        return res.status(200).json(200, {}, "Comment succesfully updated");
    } else {
        throw new ApiError(500, "Problem updating comment");
    }
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    let { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        commentId = mongoose.Types.ObjectId.createFromHexString(commentId);
    }

    const isDeleted = await Comment.deleteOne({ _id: commentId });

    if (isDeleted.deletedCount == 1) {
        return res.status(200).json(200, {}, "Comment successfully deleted");
    } else {
        throw new ApiError(500, "Problem deleting comment");
    }
});

export { getVideoComments, addComment, updateComment, deleteComment };
