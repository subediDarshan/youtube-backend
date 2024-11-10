import { Router } from "express";
import { changeAvatar, changeCoverImage, changePassword, getCurrentUser, loginUser, logoutUser, refreshAcessToken, registerUser } from "../controllers/user.controller.js";
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
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/get-current-user").post(verifyJWT, getCurrentUser)
router.route("/change-avatar").post(verifyJWT, upload.single("avatar") , changeAvatar)
router.route("/change-cover-image").post(verifyJWT, upload.single("coverImage") , changeCoverImage)

export default router