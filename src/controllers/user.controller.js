import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFileFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAcessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAcessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Problem occured while generating access token");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
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

  if (
    [username, email, fullName, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (
    await User.findOne({
      $or: [{ username, email }],
    })
  ) {
    throw new ApiError(409, "User with email or username already exists");
  }

  let avatarLocalPath;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  } else {
    throw new ApiError(400, "avatar is required");
  }
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const newUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar?.url,
    avatarPublicId: avatar?.public_id,
    coverImage: coverImage?.url,
    coverImagePublicId: coverImage?.public_id,
    password,
  });

  const searchNewUser = await User.findById(newUser._id)?.select(
    "-password -refreshToken"
  );

  if (!searchNewUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, searchNewUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  // take input from user
  // validate - not empty
  // search for that email
  // validate password
  // generate jwt token (access and refresh)
  // store in DB
  // send through cookies
  // return response

  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Account not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAcessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

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
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  // find current user
  // delete all cookies and refresh token from DB
  const user = req.user;

  await User.findByIdAndUpdate(
    user._id,
    {
      $unset: {
        refreshToken: 1, // // this removes the field from document, but should we????
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAcessToken = asyncHandler(async (req, res, next) => {
  // take refreshToken from cookie
  // decode and find its id
  // find corressponding user
  // check if the user refresh token and cookie refresh token are same
  // generate new access and refresh token
  // update refresh token in db
  // store both new tokens in cookie

  const incomingRequestToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRequestToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRequestToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "invalid refresh token");
  }

  if (incomingRequestToken !== user?.refreshToken) {
    throw new ApiError(401, "refresh token is expired");
  }

  const { accessToken, refreshToken } = await generateAcessAndRefreshToken(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "access token refreshed successfully"
      )
    );
});

// user updations

const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  // req.user gives user with no password field, so needed to get user again
  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched"));
});

const changeAvatar = asyncHandler(async (req, res, next) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "File not found");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) throw new ApiError(500, "Problem uploading file");

  const user = await User.findById(req?.user);

  const isDeleted = await deleteFileFromCloudinary(user?.avatarPublicId);

  if (!isDeleted) throw new ApiError(500, "Problem deleting avatar");

  user.avatar = avatar?.url;
  user.avatarPublicId = avatar?.public_id;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "avatar updated"));
});

const changeCoverImage = asyncHandler(async (req, res, next) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) throw new ApiError(400, "File not found");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) throw new ApiError(500, "Problem uploading file");

  const user = await User.findById(req?.user);

  const isDeleted = await deleteFileFromCloudinary(user?.coverImagePublicId);

  if (!isDeleted) throw new ApiError(500, "Problem deleting avatar");

  user.coverImage = coverImage?.url;
  user.coverImagePublicId = coverImage?.public_id;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "coverImage updated"));
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;
  console.log(fullName);

  if (!fullName && !email) {
    throw new ApiError(400, "Atleast one field is required");
  }

  const updateField = {};
  if (fullName) updateField.fullName = fullName;
  if (email) updateField.email = email;

  const updatedUser = await User.findByIdAndUpdate(
    req?.user._id,
    {
      $set: updateField,
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(400, "Account updation Failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Account successfully updated"));
});

const getChannelInfo = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "username not found");
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase().trim() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                req?.user._id,
                {
                  $map: {
                    input: "$subscribers",
                    as: "sub",
                    in: "$$sub.subscriber",
                  },
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "channel info fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: req.user._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner",
          },
        ],
      },
    },
  ]);

  if (!user) {
    throw new ApiError(500, "Cannot find user's watch history");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "WatchHistory successfully fetched"
      )
    );
});

// Type "mongoose.Types.ObjectId.createFromHexString(req.user._id)" without the new keyword since the the old code is deprecated.

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changePassword,
  getCurrentUser,
  changeAvatar,
  changeCoverImage,
  updateAccountDetails,
  getChannelInfo,
  getWatchHistory,
};
