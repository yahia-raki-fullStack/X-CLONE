import mongoose from "mongoose";

const newUser = new mongoose.Schema({
    username:{type : String,
        require: true,
        unique:true
    }
},{timestamps:true})