import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js'
import { commentOnPost, createPost, deletePost, getAllPosts, getFollowingPosts, getLikedPosts, getUserPosts, likeUnlikePost } from '../controllers/post.controller.js'
const routes = express.Router()

routes.get('/all',protectRoute,getAllPosts)
routes.get('/following',protectRoute,getFollowingPosts)
routes.get('/likes/:id',protectRoute,getLikedPosts)
routes.get('/user/:username',protectRoute,getUserPosts)
routes.post('/create',protectRoute, createPost)
routes.post('/like/:id',protectRoute,likeUnlikePost)
routes.post('/comment/:id',protectRoute,commentOnPost)
routes.delete('/:id',protectRoute,deletePost)

export default routes