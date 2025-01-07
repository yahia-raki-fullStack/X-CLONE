import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Ensure this is called before accessing env variables

const connectMongoDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("❌ MONGO_URI is not defined in environment variables.");
        }

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected Successfully!');
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        process.exit(1);
    }
};

export default connectMongoDB;
