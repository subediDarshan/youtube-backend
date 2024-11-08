import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
// import axios from "axios"


export const verifyJWT = asyncHandler( async (req, res, next) => {
    // find access token from cookie
    // decode access token
    // find id from decoded token
    // find corressponding user in DB
    // add user prop in req object and send to next


    let accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") 
    // const refreshToken = req.cookies?.refreshToken

    if(!accessToken) {
        // if(!refreshToken)
            throw new ApiError(401, "Unauthorized request")


        // try {
        //     const {data} = await axios.post("http://localhost:8000/api/v1/users//refresh-token")
        //     accessToken = data?.accessToken
        //     if(!accessToken)
        //         throw new ApiError(401, "Unauthorized request")
        // } catch (error) {
        //     throw new ApiError(500, "problem while refreshing access token")
        // }
    }

    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

    
    
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if(!user) {
        throw new ApiError(401, "Invalid access token")
    }


    req.user = user
    next()


} )