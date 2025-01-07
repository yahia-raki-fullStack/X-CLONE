import mongoose from "mongoose";

const connectMongoDB = async () => {
    try {
    const connect = await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected!')
    } catch (error) {
        console.error(`didnt connect ${error.message}`);
        process.exit(1)
    }
}

export default connectMongoDB