import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    let isLiked = false
    const like = await Like.findOneAndDelete(
        {
            video: videoId,
            likedBy: req.user._id 
        },
    )
    if(!like) {
        const newLike = await Like.create({
            video: videoId,
            likedBy: req.user._id 
        })
        isLiked = true
    }
    const totalLikes = await Like.countDocuments({
        video: videoId
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isLiked,
                totalLikes
            },
            isLiked? "Video liked successfully" : "Video unliked successfully" 
            )
        )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    let isLiked = false
    const like = await Like.findOneAndDelete({
        comment: commentId,
        likedBy: req.user._id
    })
    if(!like) {
        const newLike = await Like.create(
            {
                comment: commentId,
                likedBy: req.user._id
            }
        )
        isLiked = true
    }
    const totalLikes = await Like.countDocuments({
        comment: commentId
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isLiked,
                totalLikes
            },
            isLiked ? "Comment liked successfully" : "Comment unliked successfully" 
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    let isLiked = false
    const like = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: req.user._id
    })
    if (!like) {
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })
        isLiked = true
    }
    const totalLikes = await Like.countDocuments({
        tweet: tweetId
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                isLiked,
                totalLikes
            },
            isLiked ? "Tweet liked successfully" : "Tweet unliked successfully"
        )
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query
    //TODO: get all liked videos
    const likedVideos = await Like.aggregatePaginate(
        Like.aggregate([
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video: {
                        $exists: true,
                        $ne: null
                    }
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
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
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                thumbnailUrl: "$thumbnail.url",
                                owner: {
                                    $first: "$owner"
                                }             
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                duration: 1,
                                owner: 1,
                                views: 1,
                                thumbnailUrl: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind : "$video"
            },
            {
                $project: {
                    _id: 1,
                    video: 1
                }
            }
        ])
        ,{
            page: Number(page),
            limit: Number(limit)
        })

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "User's liked videos fetched successfully"
            )
        )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}