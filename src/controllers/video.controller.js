import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteZombieFilesOnCloudinary } from "../utils/deleteZombieFilesCloudinary.js";
import { deleteZombieFilesFromLocal } from "../utils/deleteZombieFilesFromLocal.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;
    //TODO: get all videos based on query, sort, pagination

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userid for videos");
    }
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(400, "User doesn't exist");
    }

    if (sortType === "asc") {
        sortType = 1;
    } else {
        sortType = -1;
    }

    const userVideos = await Video.aggregatePaginate(
        Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                    ...(query
                        ? { title: { $regex: query, $options: "i" } }
                        : {}),
                    isPublished: true,
                },
            },
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
                                username: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    videoOwner: {
                        $first: "$videoOwner",
                    },
                },
            },
            {
                $sort: {
                    [sortBy]: sortType,
                },
            },
            {
                $project: {
                    thumbnail: 1,
                    videoFile: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    videoOwner: 1,
                    createdAt: 1,
                },
            },
        ]),
        {
            page: Number(page),
            limit: Number(limit),
            customLabels: {
                totalDocs: "totalVideos",
                docs: "videosList",
                nextPage: "next",
                prevPage: "prev",
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(200, {
            username: user.username,
            fullName: user.fullName,
            userVideos,
        })
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video is required");
    }
    if (!thumbnailLocalPath) {
        await deleteZombieFilesFromLocal(videoFileLocalPath);
        throw new ApiError(400, "Thumbnail is required");
    }
    let videoFile = null;
    let thumbnail = null;
    try {
        //Promise.allSettled => can switch to this for future uploads
        videoFile = await uploadOnCloudinary(videoFileLocalPath);
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!videoFile || !thumbnail) {
            throw new ApiError(500, "File upload failed");
        }
        const publishedVideo = await Video.create({
            videoFile: {
                url: videoFile.url,
                public_id: videoFile.public_id,
            },
            thumbnail: {
                url: thumbnail.url,
                public_id: thumbnail.public_id,
            },
            owner: req.user._id,
            title,
            description,
            duration: videoFile.duration,
            views: 0,
            isPublished: true,
        });
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    publishedVideo,
                    "Video published successfully"
                )
            );
    } catch (error) {
        if (videoFile?.public_id) {
            await deleteZombieFilesOnCloudinary(videoFile.public_id, "video");
        }
        if (thumbnail?.public_id) {
            await deleteZombieFilesOnCloudinary(thumbnail.public_id, "image");
        }
        throw new ApiError(500, error.message || "Failed to publish video");
    }
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const userId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    const video = await Video.aggregate([
        // TODO: OPTIMIZATION NOTE
        // Currently using $lookup for likes which loads all documents into memory.
        // This is acceptable for MVP (up to ~10k likes).
        // For production scale, refactor to use a separate 'likesCount' field
        // on the Video model or optimized sub-pipelines to prevent RAM overflow.
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                videoOwner: {
                    $first: "$videoOwner",
                },
                views: {
                    $add: ["$views", 1],
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [userId, "$likes.likedBy"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                likesCount: 1,
                isLiked: 1,
                videoOwner: 1, // Object
                createdAt: 1,
            },
        },
    ]);

    if (!video?.length) {
        throw new ApiError(404, "Video not found");
    }
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body;

    if (!title && !description && !req.file) {
        throw new ApiError(400, "Atleast one field is required");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }


    let newThumbnail = null;
    try {
        const video = await Video.findById(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }
        
        if(!video.owner.equals(req.user._id)){
            throw new ApiError(403, "You are not authorized for this request")
        }

        const thumbnailLocalPath = req.file?.path;
        if (title) {
            video.title = title;
        }
        if (description) {
            video.description = description;
        }
        
        const oldThumbnailPublicId = video.thumbnail?.public_id;
        if (thumbnailLocalPath) {
            newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);


            if (!newThumbnail) {
                throw new ApiError(500, "An error occurred while uploading thumbnail to cloudinary. Please try again")
            }
            video.thumbnail = {
                url: newThumbnail.url,
                public_id: newThumbnail.public_id,
            };
        }


        const updatedVideo = await video.save({ validateBeforeSave: true });

        if(updatedVideo && newThumbnail) {
            deleteZombieFilesOnCloudinary(oldThumbnailPublicId, "image");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    title: updatedVideo.title,
                    description: updatedVideo.description,
                    thumbnail: updatedVideo.thumbnail.url,
                },
                "Video updated successfully"
            )
        );
    } catch (error) {
        if (newThumbnail?.public_id) {
            deleteZombieFilesOnCloudinary(newThumbnail.public_id, "image");
        }
        throw new ApiError(error.statusCode || 500, error.message);
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if(!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You're not authorized for this request")
    }

    const deletedResponse = await Video.findByIdAndDelete(videoId)

    if (!deletedResponse) {
        throw new ApiError(500, "Failed to delete video from database");
    }
    let oldVideoFilePublicId = video.videoFile?.public_id
    let oldThumbnailPublicId = video.thumbnail?.public_id

    if (oldVideoFilePublicId) {    
        deleteZombieFilesOnCloudinary(oldVideoFilePublicId, "video")
    }
    if (oldThumbnailPublicId) {        
        deleteZombieFilesOnCloudinary(oldThumbnailPublicId, "image")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if(!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You're not authorized for this request")
    }

    video.isPublished = !video.isPublished

    await video.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isPublished: video.isPublished
            },
            "Publish status toggled successfully"
        )
    )
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
