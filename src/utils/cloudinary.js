import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import { ApiError } from './apiError.js';
// import { ApiError } from './apiError';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(
           localFilePath,
           {
               resource_type: "auto",
           }
       )
       fs.unlinkSync(localFilePath)
       return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}


const deleteFileFromCloudinary = async (publicId) => {
    try {
        if(!publicId)
            throw new ApiError(500, "file id not passed")
        const response = await cloudinary.uploader.destroy(publicId)
        return response
    } catch (error) {
        throw new ApiError(500, "problem deleting old file")
    }
}

export { uploadOnCloudinary, deleteFileFromCloudinary }