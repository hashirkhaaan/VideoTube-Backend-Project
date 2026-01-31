import mongoose, {Schema} from 'mongoose';
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User" // One who is subscribing
        },
        channel: {
            type: Schema.Types.ObjectId, //One to whom the 'subscriber' is subscribing
            ref: "User"
        }
    }, 
    {
    timestamps: true
    }
)
// Is line ka matlab hai: "Aik Subscriber, Aik Channel ko sirf 1 baar subscribe kar sakta hai
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

subscriptionSchema.plugin(mongooseAggregatePaginate);
export const Subscription = mongoose.model("Subscription", subscriptionSchema)