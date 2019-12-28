import mongoose, {Schema} from 'mongoose';
import timestamps from 'mongoose-timestamp';
import {composeWithMongoose} from 'graphql-compose-mongoose';

const PostSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    id: {
        type: Number,
        unique: true,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'Author',
        required: true
    },
    dateCreated: {
      type: Date,
      required: true
    },
    lastModified: {
        type: Date,
        required: false
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Author',
        required: false
    },
    picture: {
        type: mongoose.SchemaTypes.Url,
        required: false
    }
}, {collection: 'Post'});


PostSchema.pre('save', async function (next) {
    const post = this;
    if(post && post.hasOwnProperty('body') && !post.body.isModified){
        return next;
    }
    post.dateCreated = new Date();
    const lastPost = await Post.findAll({id: {$exists: true}}).sort({id: -1}).limit(1);
    post.id = lastPost.id + 1;
    if(post && post.hasOwnProperty('body') && post.body.isModified){
        post.lastModified = new Date();
        return next;
    }
});

PostSchema.plugin(timestamps);

export const PostModel =  mongoose.model('Post', PostSchema);
