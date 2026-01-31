import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user?._id
    if(!userId) {
        throw new ApiError(403, "Unauthorized Request")
    }

    const [channelStats, totalSubscribers] = await Promise.all([
        Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likesCount",
                    pipeline: [
                        {
                            $count: "count"
                        }
                    ]
                }
            },
            {
                $addFields: {
                    likesCount: {
                        $ifNull: [
                            {
                                $arrayElemAt: ["$likesCount.count", 0]
                            },
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalVideos:{
                        $sum: 1
                    },
                    totalViews: {
                        $sum: "$views"
                    },
                    totalLikes: {
                        $sum: "$likesCount"
                    }
                }
            },
            {
                $project: {
                    totalVideos: 1,
                    totalViews: 1,
                    totalLikes: 1
                }
            }
        ]),
        Subscription.countDocuments({
            channel: userId
        })
    ])

    const stats = {
        totalSubscribers: totalSubscribers || 0,
        totalLikes: channelStats[0]?.totalLikes || 0,
        totalViews: channelStats[0]?.totalViews || 0,
        totalVideos: channelStats[0]?.totalVideos || 0
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            stats,
            "Channel Stats fetched successfully"
        )
    )

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { channelId } = req.params
    let { page = 1, limit = 10, sortType = "desc" } = req.query
    page = parseInt(page)
    limit = parseInt(limit)

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    if(isNaN(page) || page < 1) {
        page = 1
    }
    if(isNaN(limit) || limit < 1 || limit > 100) {
        limit = 10
    }
    const skip = (page - 1) * limit
    const videos = await Video.find(
        {
            owner: channelId,
            isPublished: true
        }
    )
    .sort({
        createdAt: sortType === "desc"? -1 : 1
    })
    .skip(skip)
    .limit(limit)
    .select("-isPublished -updatedAt")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }