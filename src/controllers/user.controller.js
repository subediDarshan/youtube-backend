import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"



const generateAcessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAcessToken()
        const refreshToken = await user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Problem occured while generating access token")
    }

}




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


const loginUser = asyncHandler( async (req, res, next) => {
    // take input from user
    // validate - not empty
    // search for that email
    // validate password
    // generate jwt token (access and refresh)
    // store in DB
    // send through cookies
    // return response

    const { email, password } = req.body;
    

    if(!email || !password) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({email})

    if(!user) {
        throw new ApiError(404, "Account not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid Password")
    }

    const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id)

    
    

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, 
            "User logged in successfully")
        )


} )


const logoutUser = asyncHandler( async (req, res, next) => {
    // find current user
    // delete all cookies and refresh token from DB
    const user = req.user
    
    await User.findByIdAndUpdate(
        user._id,
        {
            $unset: {
                refreshToken: 1   // // this removes the field from document
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))




} )


const refreshAcessToken = asyncHandler( async (req, res, next) => {
    // take refreshToken from cookie
    // decode and find its id
    // find corressponding user
    // check if the user refresh token and cookie refresh token are same
    // generate new access and refresh token
    // update refresh token in db
    // store both new tokens in cookie

    const incomingRequestToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRequestToken) {
        throw new ApiError(401, "unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRequestToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if(!user) {
        throw new ApiError(401, "invalid refresh token")
    }

    if(incomingRequestToken !== user?.refreshToken) {
        throw new ApiError(401, "refresh token is expired")
    }

    const { accessToken, refreshToken } = await generateAcessAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {accessToken, refreshToken}, "access token refreshed successfully"))



} )



// user updations

const changePassword = asyncHandler( async (req, res, next) => {
    const {oldPassword, newPassword} = req.body;

    // req.user gives user with no password field, so needed to get user again
    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid) {
        throw new ApiError(400, "Incorrect old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

} )


const getCurrentUser = asyncHandler( async (req, res, next) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched"))
} )




export { registerUser, loginUser, logoutUser, refreshAcessToken, changePassword, getCurrentUser }