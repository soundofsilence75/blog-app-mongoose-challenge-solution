const chai = require("chai");
const chaiHTTP = require("chai-http");
const faker = require("faker");
const mongoose = require("mongoose");

const should = chai.should();

const {BlogPost} = require("../models");
const {app, runServer, closeServer} = require("../server");
const {TEST_DATABASE_URL} = require("..config");

chai.use(chaiHTTP);

function seedBlogPostData() {
    console.info("seeding blogpost data");
    const seedData = [];

    for (let i = 1; i < 10; i++) {
        seedData.push(generateBlogPostData());
    }

    return BlogPost.insertMany(seedData);
}

function generateTitle() {
    const titles = [
        "Dogs r cool", "Cats r kool", "What's up with turtles?", "Don't forget fish"
    ];
    return titles[Math.floor(Math.random() * titles.length)];
}

function generateContent() {
    const contents = ["lol", "haha u rite", "nah LOL"];
    return contents[Math.floor(Math.random() * contents.length)];
}

function generateAuthor() {
    return {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
}

function generateBlogPostData() {
    return {
        title: generateTitle(),
        content: generateContent(),
        author: generateAuthor()
    };
}

function tearDownDb() {
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
}

describe("Blogpost API resource", function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });
});

describe("GET endpoint", function() {
    it("should return all existing restaurants", function() {
        let res;
        return chai.request(app)
            .get("/restauraunts")
            .then(function(_res) {
                res = _res;
                res.should.have.status(200);
                res.body.blogposts.should.have.length.of.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                res.body.blogposts.should.have.length.of(count);
            });
    });

    it("should return blogposts with right fields", function() {
        let resBlogPost;
        return chai.request(app)
            .get("/blogposts")
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.blogposts.should.be.a("array");
                res.body.blogposts.should.have.length.of.at.least(1);

                res.body.blogposts.forEach(function(blogpost) {
                    blogpost.should.be.a("object");
                    blogpost.should.include.keys(
                        "id", "title", "content", "author");
                });
                resBlogPost = res.body.blogposts[0];
                return BlogPost.findById(resBlogPost.id);
            })
            .then(function(restauraunt) {
                resBlogPost.id.should.equal(blogpost.id);
                resBlogPost.title.should.equal(blogpost.title);
                resBlogPost.author.should.equal(blogpost.author);
            });
    });
});

describe("POST endpoint", function() {
    it("should add a new blogpost", function() {
        const newBlogPost = generateBlogPostData();
        
        return chai.request(app)
            .post("/blogposts")
            .send(newBlogPost)
            .then(function(res) {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a("object");
                res.body.should.include.keys(
                    "id", "title", "author", "content");
                    res.body.title.should.equal(newBlogPost.title);
                    res.body.id.should.not.be.null;
                    res.body.content.should.equal(newBlogPost.content);
                    res.body.author.should.equal(newBlogPost.author);

                    return BlogPost.findById(res.body.id);
                })
            .then(function(blogpost) {
                blogpost.title.should.equal(newBlogPost.title);
                blogpost.content.should.equal(newBlogPost.content);
                blogpost.author.firstName.should.equal(newBlogPost.author.firstName);
                blogpost.author.lastName.should.equal(newBlogPost.author.lastName);
            });
    });
});

describe("PUT endpoint", function() {
    it("should update fields you send over", function() {
        const updateData = {
            title: "foo",
            content: "bar"
        };

        return BlogPost
            .findOne()
            .then(function(blogPost) {
                updateData.id = blogPost.id;

                return chai.request(app)
                    .put(`/blogposts/${blogPost.id}`)
                    .send(updateData);
            })
            .then(function(res) {
                res.should.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(function(blogpost) {
                blogpost.title.should.equal(updateData.title);
                blogpost.content.should.equal(updateData.content);
            });
    });
});

describe("DELETE endpoint", function() {
    it("should delete a blogpost by id", function() {
        let blogPost;

        return BlogPost
            .findOne()
            .then(function(_blogPost) {
                blogPost = _blogPost;
                return chai.request(app).delete(`/blogposts/${blogPost.id}`);
            })
            .then(function(_blogPost) {
                should.not.exist(_blogPost);
            });
    });
});