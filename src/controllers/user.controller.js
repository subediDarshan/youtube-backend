import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";


const registerUser = asyncHandler( async (req, res, next) => {
    // take name, username, password from user
        // validate it - not empty
        // check if email already has account or username is not unique
    // check for required files
    // upload files in cloudinary and store url
    // create user in DB
    // validate if user is actually created
    // remove password and refresh token fields
    // return createdUser response


    const { username, email, fullName, password } = req.body;

    if(
        [username, email, fullName, password].some((field) => field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    if(
        await User.findOne({
            $or: [{username, email}]
        })
    ) {
        throw new ApiError(409, "User with email or username already exists")
    }



    let avatarLocalPath;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    } else {
        throw new ApiError(400, "avatar is required")
    }
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    

    const newUser = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url,
        password,
    })

    
    const searchNewUser = await User.findById(newUser._id)?.select("-password -refreshToken")


    if(!searchNewUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }


    return res.status(201).json(new ApiResponse(200, searchNewUser, "User created successfully"))


} )

export { registerUser }