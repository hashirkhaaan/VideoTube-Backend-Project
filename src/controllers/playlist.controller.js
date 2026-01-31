import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    //TODO: create playlist
    if ([name, description].some((field) => !field || field?.trim() === "")) {
        throw new ApiError(
            400,
            "Name and description are required for playlist creation"
        );
    }

    const owner = req.user._id;
    const newPlayList = await Playlist.create({
        name,
        description,
        videos: [],
        owner,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, newPlayList, "Playlist created successfully")
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    //TODO: get user playlists
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invlaid user id");
    }
    const userPlaylists = await Playlist.aggregatePaginate(
        Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $addFields: {
                    firstVideoId: {
                        $cond: {
                            if: {
                                $isArray: "$videos",
                            },
                            then: {
                                $arrayElemAt: ["$videos", 0],
                            },
                            else: null,
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "firstVideoId",
                    foreignField: "_id",
                    as: "firstVideoThumbnail",
                    pipeline: [
                        {
                            $project: {
                                thumbnail: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    totalVideos: {
                        $size: "$videos",
                    },
                    thumbnail: {
                        $arrayElemAt: ["$firstVideoThumbnail.thumbnail", 0],
                    },
                },
            },
            {
                $project: {
                    name: 1,
                    thumbnail: 1,
                    totalVideos: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]),
        {
            page: Number(page),
            limit: Number(limit),
        }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userPlaylists,
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
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
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
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
                            as: "videoOwner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        avatar: 1,
                                        username: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            videoUrl: "$videoFile.url",
                            videoThumbnail: "$videoFile.thumbnail",
                            videoOwner: {
                                $first: "$videoOwner",
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            videoUrl: 1,
                            videoThumbnail: 1,
                            videoOwner: 1,
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
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    if (!playlist?.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new ApiError(400, "Invalid playlist id or video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
        },
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you are not authorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    // TODO: remove video from playlist

    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new ApiError(400, "Invalid playlist id or video id");
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
        },
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or you are not authorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findOneAndDelete(
        {
            _id: playlistId,
            owner: req.user._id,
        }
    );
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    if(
        name === undefined && description === undefined
    ) {
        throw new ApiError(400, "Atleast one field is required out of name and description")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $set: {
                name, 
                description
            }
        },
        {
            new: true
        }
    )
    if(!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or you are not authorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        )
    )

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
