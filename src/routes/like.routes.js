import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller";

const router = Router();
router.use(verifyJWT);

router.route("/toggle/video/:videoId").post(toggleVideoLike);
router.route("/toggle/channel/:commentId").post(toggleCommentLike);
router.route("/toggle/tweet/:tweetId").post(toggleTweetLike);
router.route("videos").get(getLikedVideos);

export default router;
