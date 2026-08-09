/**
 * 🧪 Model Test Script
 * Run:  node testModels.js
 * 
 * This connects to your MongoDB, creates a User → Post → Comment,
 * then reads them back and cleans up.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");

// Fix DNS for MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

async function testModels() {
    console.log("⏳ Connecting to MongoDB...\n");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected!\n");

    // ─── 1. Test User Model ────────────────────────────────
    console.log("━━━ Testing USER Model ━━━");
    
    const user = await User.create({
        name: "Test User",
        email: "testuser_" + Date.now() + "@gmail.com", // unique email each run
        password: "mypassword123",
        age: 25,
    });
    console.log("✅ User created:", user.name, "|", user.email);
    console.log("   → Password is hashed:", user.password !== "mypassword123" ? "YES ✅" : "NO ❌");
    
    // Test password matching
    const fetchedUser = await User.findById(user._id).select("+password");
    const passwordMatch = await fetchedUser.matchPassword("mypassword123");
    console.log("   → matchPassword() works:", passwordMatch ? "YES ✅" : "NO ❌");
    
    // Test JWT generation
    const token = fetchedUser.generateAuthToken();
    console.log("   → JWT generated:", token.substring(0, 30) + "... ✅");
    console.log();

    // ─── 2. Test Post Model ────────────────────────────────
    console.log("━━━ Testing POST Model ━━━");
    
    const post = await Post.create({
        title: "My First Post",
        content: "This is a test post to verify the Post model works correctly!",
        author: user._id,
        tags: ["test", "backend"],
    });
    console.log("✅ Post created:", post.title);
    console.log("   → Author ref:", post.author);
    console.log("   → Tags:", post.tags.join(", "));
    
    // Test populate (join)
    const populatedPost = await Post.findById(post._id).populate("author", "name email");
    console.log("   → Populated author:", populatedPost.author.name, "|", populatedPost.author.email, "✅");
    console.log();

    // ─── 3. Test Comment Model ─────────────────────────────
    console.log("━━━ Testing COMMENT Model ━━━");
    
    const comment = await Comment.create({
        text: "Great post! This is a test comment.",
        post: post._id,
        author: user._id,
    });
    console.log("✅ Comment created:", comment.text);
    
    // Test populate (join both refs)
    const populatedComment = await Comment.findById(comment._id)
        .populate("author", "name")
        .populate("post", "title");
    console.log("   → On post:", populatedComment.post.title);
    console.log("   → By user:", populatedComment.author.name, "✅");
    console.log();

    // ─── 4. Cleanup ────────────────────────────────────────
    console.log("━━━ Cleaning up test data ━━━");
    await Comment.findByIdAndDelete(comment._id);
    await Post.findByIdAndDelete(post._id);
    await User.findByIdAndDelete(user._id);
    console.log("🧹 All test documents deleted.\n");

    // ─── Done ──────────────────────────────────────────────
    console.log("🎉 ALL MODELS PASSED! Everything works correctly.\n");
    
    await mongoose.disconnect();
    console.log("📴 Disconnected from MongoDB.");
}

testModels().catch((err) => {
    console.error("\n❌ TEST FAILED:", err.message);
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
});
