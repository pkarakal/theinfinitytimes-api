const {UserModel} = require('../models/user');
const {AccountModel} = require('../models/account');
const {CommentModel} = require('../models/comment');
const {AuthorModel} = require('../models/author');
const {PostModel} = require('../models/post');
const {ForbiddenError} = require('apollo-server-express');

module.exports.post = async (_, args, req) => {
    try {
        const post = await PostModel.findOne({id: args.id});
        const comments = await CommentModel.find({post: post._doc._id});
        const author = await AuthorModel.findById(post._doc.author);
        const account = await AccountModel.findById(author._doc.account);
        account._doc.user =await UserModel.findById(account._doc.user);
        author._doc.account = account;
        post._doc.author = author;
        post._doc.comments = [...comments];
        return post;
    } catch (e) {
        console.log(e);
    }
};
module.exports.posts = async (_, args, req) => {
    try {
        const posts =  await PostModel.find({_id: {$exists: true}});
        return await posts.map(async (post) => {
            const comments = await CommentModel.find({post: post._doc._id});
            const author = await AuthorModel.findById(post._doc.author);
            const account = await AccountModel.findById(author._doc.account);
            account._doc.user =await UserModel.findById(account._doc.user);
            author._doc.account = account;
            post._doc.author = author;
            if(!post._doc.comments){
                post._doc.comments = []
            }
            if(comments && comments.length) {
                post._doc.comments = [...comments];
            } else {
                post._doc.comments = []
            }
            return post;
        });
    } catch (e) {
        console.log(e);
    }
};
module.exports.addPost = async (_, args, req) => {
    req.user = {...req.user, ...(await req.user.checkAuthentication())};
    const reqUser = req.user._doc;
    if(reqUser && reqUser.accountType && (reqUser.accountType === 'admin' || reqUser.accountType === 'author')) {
        let lastPost = await PostModel.find({id: {$exists: true}}).sort({id: -1}).limit(1);
        if (Array.isArray(lastPost) && lastPost.length > 0) {
            lastPost = lastPost[0]
        }
        let post = new PostModel({
            title: args.post.title,
            body: args.post.body,
            picture: [],
            author: args.post.author,
            id: lastPost['id'] + 1,
            dateCreated: new Date(),
            tags: []
        });
        if (Array.isArray(lastPost) && lastPost.length === 0) {
            post.id = 0;
        }
        if (args.post.picture && Array.isArray(args.post.picture) && args.post.picture.length) {
            args.post.picture.forEach(x => {
                post.picture.push(x);
            });
        }
        if (args.post.tags && Array.isArray(args.post.tags) && args.post.tags.length) {
            args.post.tags.forEach(x => {
                post.tags.push(x);
            });
        }
        try {
            const result = await post.save();
            let author = await AuthorModel.find({_id: args.post.author});
            if (Array.isArray(author) && author.length > 0) {
                author = author[0];
            }
            author['posts'].push(result._id.toString());
            await author.save();
            return result;
        } catch (e) {
            console.log('Could not save the post');
            console.log(e);
        }
    } else {
        throw new ForbiddenError('403-Forbidden');
    }
};

module.exports.editPost = async (_, args, req) => {
    req.user = {...req.user, ...(await req.user.checkAuthentication())};
    const reqUser = req.user._doc;
    if(reqUser && reqUser.accountType && (reqUser._id === args.post.author || reqUser.accountType === 'admin')) {
        let post = await PostModel.findOne({id: args.post.id});
        if (post) {
            args.post.lastModified = new Date();
            if (post.author !== args.post.author) {
                args.post.author = post.author;
            }
            try {
                if (post.tags !== args.post.tags) {
                    return await PostModel.findOneAndUpdate({id: args.post.id}, {
                        $set: args.post,
                        $push: {'post.tags': {$each: args.post.tags}}
                    }, {new: true});
                }
            } catch (e) {
                console.log(e);
                throw new Error(e);
            }
        }
    } else {
        throw new ForbiddenError('403-Forbidden');
    }
};

module.exports.deletePost = async (_, args, req) => {
    req.user = {...req.user, ...(await req.user.checkAuthentication())};
    const reqUser = req.user._doc;
    if(reqUser && reqUser.accountType && reqUser.accountType === 'admin') {
        let post = await PostModel.findById(args.post._id);
        if (post && (typeof post === 'object')) {
            if (args.post.id !== post.id) {
                throw new Error("The post ids don't match ");
            }
            if (args.post.title !== post.title) {
                throw new Error("The titles don't match");
            }
            if (args.post.author !== post.author.toString()) {
                throw new Error("The authors don't match");
            }
            try {
                const author = await AuthorModel.findById(args.post.author);
                if (author) {
                    let posts = [];
                    author.posts.forEach(x => {
                        if (x.toString() !== args.post._id) {
                            posts.push(x);
                        }
                    });
                    author.posts = [];
                    posts.forEach(x => {
                        author.posts.push(x);
                    });
                    await author.save();
                    return await PostModel.findOneAndDelete(args.post._id);
                } else {
                    throw new Error("Couldn't find the author");
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        }
    } else {
        throw new ForbiddenError('403-Forbidden');
    }
};

module.exports.postsByTag = async(_, args, req) => {
  try {
      if(args.tag !== undefined && (typeof args.tag === 'number')) {
          const posts =  await PostModel.find({tags: args.tag});
          return posts.map(async (post) => {
              const comments = await CommentModel.find({post: post._doc._id});
              const author = await AuthorModel.findById(post._doc.author);
              const account = await AccountModel.findById(author._doc.account);
              account._doc.user =await UserModel.findById(account._doc.user);
              author._doc.account = account;
              post._doc.author = author;
              if(!post._doc.comments){
                  post._doc.comments = []
              }
              if(comments && comments.length) {
                  post._doc.comments = [...comments];
              } else {
                  post._doc.comments = []
              }
              return post;
          });
      } else {
          throw new Error("Tag can only be a integer");
      }
  } catch (e) {
      console.log(e);
      throw e;
  }
};
