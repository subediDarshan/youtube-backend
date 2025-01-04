import ApiResponse from "../utils/apiResponse";

const healthcheck = (req, res, next) => {
  res.status(200).json(new ApiResponse(200, {}, "All OK"));
};

export default healthcheck;
