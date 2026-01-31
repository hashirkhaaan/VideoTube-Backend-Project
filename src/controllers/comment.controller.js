import mongoose, {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const comments = await Comment.aggregatePaginate(
        Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
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
                                username: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "commentLikes",
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    },
                    likesPerComment: {
                        $size: "$commentLikes"
                    }
                }
            },
            {
                $project: {
                    content: 1,
                    owner: 1,
                    likesPerComment: 1,
                    createdAt: 1
                }
            }
        ])
        ,
        {
            page: Number(page),
            limit: Number(limit)
        }
    )
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comments,
            "Video comments fetched successfully"
        )
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    if(!content || content.trim() === "") {
        throw new ApiError(400, "Comment can't be empty")
    }
    const videoExists = await Video.exists({
        _id: videoId
    })
    if(!videoExists) {
        throw new ApiError(404, "Video not found")
    }
    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            comment,
            "Commented Successfully on video"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    if(!content || content.trim() === "") {
        throw new ApiError(400, "Comment can't be empty")
    }
    const comment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id
        },
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true
        }
    )
    if(!comment) {
        throw new ApiError(404, "Comment not found or you are not authorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment updated successfully"
        )
    )
 
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    const deletedComment = await Comment.findOneAndDelete(
        {
            _id: commentId,
            owner: req.user._id
        },
    )
    if(!deletedComment) {
        throw new ApiError(404, "Comment not found or you are not authorized")
    }
    await Like.deleteMany({
        comment: commentId
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedComment,
            "Comment deleted successfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
