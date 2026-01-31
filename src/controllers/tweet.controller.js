import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    // get content from front-end and validate for empty
    // because user is logged in, so we can get his id from req.user due to verifyJWT middleware
    // then create a tweet document using Tweet in database and send values
    // return response to frontend

    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet must not be empty");
    }
    const createdTweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, createdTweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    // get user id from req.params.userId
    // make database call and retrieve tweets with userId same as our logged in user
    // return response

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId).select("username fullName")

    if (!user) {
        throw new ApiError(404, "User doesn't exist");
    }

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "totalLikes",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $addFields: {
                totalLikesPerTweet: {
                    $size: "$totalLikes",
                },
            },
        },
        {
            $project: {
                content: 1,
                totalLikesPerTweet: 1,
                createdAt: 1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                username: user.username,
                fullName: user.fullName,
                userTweets,
            },
            "User tweets fetched successfully"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet must not be empty");
    }

    const currentTweet = await Tweet.findById(tweetId);

    if (!currentTweet) {
        throw new ApiError(404, "Tweet doesn't exist");
    }

    if (!currentTweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    currentTweet.content = content.trim();
    const updatedTweet = await currentTweet.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Tweet updated successfully"
        )
    )

});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const deletedTweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id
    })

    if (!deletedTweet) {
        throw new ApiError(404, "Tweet doesn't exist or you are not authorized to delete this tweet");
    }

    await Like.deleteMany({
        tweet: tweetId
    })
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedTweet,
            "Tweet deleted successfully"
        )
    )
    



});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
