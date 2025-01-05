import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    //TODO: create playlist
    // just create playlist with name and description

    if (!name) {
        throw new ApiError(400, "Name is required");
    }

    let owner = req.user._id;

    if (!isValidObjectId(owner)) {
        owner = mongoose.Types.ObjectId.createFromHexString(owner);
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner,
    });

    if (playlist) {
        return res
            .status(201)
            .json(
                new ApiResponse(201, playlist, "Playlist created successfully")
            );
    } else {
        throw new ApiError(500, "Problem creating playlist");
    }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    let { userId } = req.params;
    //TODO: get user playlists
    //use aggregate pipeline in playlist model
    //match owner field with userId from params
    //lookup for videos field -> subpipeline for owner field of video
    //lookup for owner field of playlist

    if (!isValidObjectId(userId)) {
        userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                        $unwind: "$owner",
                    },
                ],
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

    if (Array.isArray(playlist)) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    playlist,
                    "user playlist successfully fetched"
                )
            );
    } else {
        throw new ApiError(500, "Problem fetching user playlist");
    }
});

const getPlaylistById = asyncHandler(async (req, res) => {
    let { playlistId } = req.params;
    //TODO: get playlist by id
    // match and give playlist from DB
    // but need aggregation is needed for lookup

    if (!isValidObjectId(playlistId)) {
        playlistId = mongoose.Types.ObjectId.createFromHexString(playlistId);
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: playlistId,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                        $unwind: "$owner",
                    },
                ],
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

    if (Array.isArray(playlist) && playlist.length > 0) {
        return (
            res.status(200),
            json(
                new ApiResponse(
                    200,
                    playlist[0],
                    "playlist successfully fetched"
                )
            )
        );
    } else {
        throw new ApiError(500, "Problem fetching playlist");
    }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    let { playlistId, videoId } = req.params;
    // TODO: add video to playlist
    // find playlist from playlistId
    // update that playlist by adding videoId on videos field

    if (!isValidObjectId(playlistId)) {
        playlistId = mongoose.Types.ObjectId.createFromHexString(playlistId);
    }
    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const playlist = await Playlist.updateOne(
        { _id: playlistId },
        {
            $push: { videos: videoId },
        }
    );

    if (playlist.modifiedCount > 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video successfully added"));
    } else {
        throw new ApiError(500, "Problem adding video");
    }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    let { playlistId, videoId } = req.params;
    // TODO: remove video from playlist
    // find playlist from playlistId
    // update that playlist by removing videoId from videos field

    if (!isValidObjectId(playlistId)) {
        playlistId = mongoose.Types.ObjectId.createFromHexString(playlistId);
    }
    if (!isValidObjectId(videoId)) {
        videoId = mongoose.Types.ObjectId.createFromHexString(videoId);
    }

    const playlist = await Playlist.updateOne(
        { _id: playlistId },
        {
            $pull: { videos: videoId },
        }
    );

    if (playlist.modifiedCount > 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video successfully removed"));
    } else {
        throw new ApiError(500, "Problem removing video");
    }
});

const deletePlaylist = asyncHandler(async (req, res) => {
    let { playlistId } = req.params;
    // TODO: delete playlist
    // just find and delete a playlist

    if (!isValidObjectId(playlistId)) {
        playlistId = mongoose.Types.ObjectId.createFromHexString(playlistId);
    }

    const result = await Playlist.deleteOne({ _id: playlistId });

    if (result?.deletedCount == 1) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Playlist successfully deleted"));
    } else {
        throw new ApiError(500, "Problem deleting playlist");
    }
});

const updatePlaylist = asyncHandler(async (req, res) => {
    let { playlistId } = req.params;
    const { name, description } = req.body;
    //TODO: update playlist
    // find plalyist from playlistId
    // then update name and description

    if (!isValidObjectId(playlistId)) {
        playlistId = mongoose.Types.ObjectId.createFromHexString(playlistId);
    }

    if (!name) {
        throw new ApiError(400, "Name is required");
    }
    const updateFields = { name };
    if (description) {
        updateFields.description = description;
    }

    const result = await Playlist.updateOne(
        { _id: playlistId },
        {
            $set: updateFields,
        }
    );

    if (result.modifiedCount == 1) {
        return res.status(200).json(200, {}, "Playlist updated successfully");
    } else {
        throw new ApiError(500, "Problem updating playlist");
    }
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
