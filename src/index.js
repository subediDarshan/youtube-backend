import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: './.env',
})


connectDB()
.then(() => {

    app.on("error", () => {
        throw error
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server: http://localhost:${process.env.PORT}`);
    })

})
.catch((err) => {
    console.log("ERR: ", err);
})