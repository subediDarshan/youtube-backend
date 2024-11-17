import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        req: "User",
    },
    channel: {
        type: Schema.Types.ObjectId,
        req: "User",
    }
}, {timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)