import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription
    const userId = req.user._id;

    if (
        !(
            mongoose.isValidObjectId(channelId) &&
            mongoose.isValidObjectId(userId)
        )
    ) {
        throw new ApiError(400, "Channel id or user id maybe wrong");
    }
    if (channelId.equals(userId)) {
        throw new ApiError(403, "You can't subscribe your own channel");
    }

    const subscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId,
    });

    if (subscription) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "UnSubscribed successfully"));
    }

    if (!subscription) {
        const channel = await User.findById(channelId);

        if (!channel) {
            throw new ApiError(404, "Channel doesn't exist");
        }

        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: userId,
        });

        if (!newSubscription) {
            throw new ApiError(
                500,
                "Couldn't create subscription due to server error"
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Subscribed successfully"));
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    if (!req.user._id.equals(channelId)) {
        throw new ApiError(403, "You are not authorized for this request");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
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
                subscriberDetails: {
                    $first: "$subscriberDetails",
                },
            },
        },
        {
            $project: {
                subscriberDetails: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "Subscribers list fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id");
    }

    const subscribedChannels = await Subscription.aggregatePaginate(
        Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
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
            $addFields: {
                channelDetails: {
                    $first: "$channelDetails"
                }
            }
        },
        {
            $project: {
                channelDetails: 1
            }
        }
    ]),
    {
        page: (Number(page)),
        limit: Number(limit)
    }
)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribedChannels,
            "Subscribed channels list fetched successfully"
        )
    )    

});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
