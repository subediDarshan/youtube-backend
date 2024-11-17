import { Router } from "express";
import { changeAvatar, changeCoverImage, changePassword, getChannelInfo, getCurrentUser, loginUser, logoutUser, refreshAcessToken, registerUser, updateAccountDetails } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1,
    },
    {
        name: "coverImage",
        maxCount: 1
    },
]), registerUser)


// secured routes
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAcessToken)
router.route("/change-password").patch(verifyJWT, changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/change-avatar").patch(verifyJWT, upload.single("avatar") , changeAvatar)
router.route("/change-cover-image").patch(verifyJWT, upload.single("coverImage") , changeCoverImage)
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails)
router.route("/c/:username").get(verifyJWT, getChannelInfo)

export default router