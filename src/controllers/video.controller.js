import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteFileFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;
    //TODO: get all videos based on query, sort, pagination

    const filters = {};
    if (query) filters.title = { $regex: query, $options: "i" };
    if (userId) {
        if (!isValidObjectId(userId)) {
            userId = mongoose.Types.ObjectId.createFromHexString(userId);
        }
        filters.owner = userId;
    }

    const videos = await Video.aggregate([
        {
            $match: filters,
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
    ]);

    if (videos && Array.isArray(videos)) {
        if (videos.length > 0) {
            return res
                .status(200)
                .json(
                    new ApiResponse(200, videos, "Videos fetched successfully")
                );
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, [], "No videos found"));
        }
    } else {
        throw new ApiError(500, "Problem finding videos");
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    let userId = req?.user?._id;
    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    if (!title || !description) {
        throw new ApiError(400, "All fields are required");
    }

    const videoLocalPath = req?.files?.videoFile[0]?.path;
    if (!videoLocalPath) throw new ApiError(500, "Video not found");
    const thumbnailLocalPath = req?.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) throw new ApiError(500, "Thumbnail not found");

    const video = await uploadOnCloudinary(videoLocalPath);
    if (!video) throw new ApiError(500, "Problem uploading video");
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) throw new ApiError(500, "Problem uploading Thumbnail");

    const videoDocument = await Video.create({
        videoFile: video?.url,
        videoFilePublicId: video?.public_id,
        thumbnail: thumbnail?.url,
        thumbnailPublicId: thumbnail?.public_id,
        owner: userId,
        title,
        description,
        duration: video?.duration,
        // views: 0,
        // isPublished: true,
    });

    if (!videoDocument)
        throw new ApiError(500, "Problem creating video document");

    return res
        .status(201)
        .json(
            new ApiResponse(201, videoDocument, "Video published successfully")
        );
});

const getVideoById = asyncHandler(async (req, res) => {
    let { videoId } = req.params;
    //TODO: get video by id

    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: videoId,
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
    ]);

    if (video && Array.isArray(video) && video.length > 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, video[0], "Video fetched successfully"));
    } else {
        throw new ApiError(404, "Video cannot be found");
    }
});

const updateVideo = asyncHandler(async (req, res) => {
    let { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const { title, description } = req.body;
    const thumbnailLocalPath = req?.file?.path;
    let thumbnail;
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) throw new ApiError(500, "Problem uploading thumbnail");
        const oldVideoDocument = await Video.findById(videoId);
        if (!oldVideoDocument) throw new ApiError(500, "Invalid videoId");

        const isDeleted = await deleteFileFromCloudinary(
            oldVideoDocument?.thumbnailPublicId
        );
        if (!isDeleted)
            throw new ApiError(500, "problem deleting old thumbail");
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (thumbnail) updateFields.thumbnail = thumbnail;

    const result = await Video.updateOne(
        { _id: videoId },
        {
            $set: updateFields,
        }
    );

    if (result.modifiedCount > 0) {
        return res.status(200).json(new ApiResponse(200, {}, "Video updated"));
    } else {
        throw new ApiError(500, "Problem updating video");
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    let { videoId } = req.params;
    //TODO: delete video
    // first delete from clodinary
    // then delete video document

    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video cannot be found");

    const isDeleted = await deleteFileFromCloudinary(video?.videoFilePublicId);
    if (!isDeleted) throw new ApiError(500, "Problem deleting video");

    const result = await Video.deleteOne({ _id: videoId });
    if (result.deletedCount == 1) {
        return res.status(200).json(200, {}, "Video deleted");
    } else {
        throw new ApiError(500, "Problem deleting video");
    }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video cannot be found");

    if (video?.isPublished) {
        video.isPublished = false;
        await video.save({ validateBeforeSave: false });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video Unpublished"));
    } else {
        video.isPublished = true;
        await video.save({ validateBeforeSave: false });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video Published"));
    }
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
