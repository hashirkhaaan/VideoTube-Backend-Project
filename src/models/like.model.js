import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);
// 1. Video Likes ke liye Unique Rule
likeSchema.index(
    { video: 1, likedBy: 1 },
    {
        unique: true,
        partialFilterExpression: { video: { $exists: true } }, // Sirf tab jab video ki ID ho
    }
);

// 2. Comment Likes ke liye Unique Rule
likeSchema.index(
    { comment: 1, likedBy: 1 },
    {
        unique: true,
        partialFilterExpression: {
            comment: {
                $exists: true,
            },
        },
    }
);

// 3. Tweet Likes ke liye Unique Rule
likeSchema.index(
    { tweet: 1, likedBy: 1 },
    {
        unique: true,
        partialFilterExpression: { tweet: { $exists: true } },
    }
);
likeSchema.plugin(mongooseAggregatePaginate);
export const Like = mongoose.model("Like", likeSchema);
