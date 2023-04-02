var express = require('express');
var router = express.Router();
const REGEX = /[0-9A-Za-z]{3,12}/
const MAX_RAND = 1000,
    COMMENT_INVALID_MSG = 'Comment must be between 1 and 128 characters in length',
    INVALID_NAME_MSG = ' Name must contain only digits(0-9) or letters(a-z) and be between 3 and 20 characters in length',
    PAGE_NOT_FOUND = 404, [VALID, INVALID] = [200, 400], [COMMENT_MIN_LEN, COMMENT_MAX_LEN] = [1, 128],
    DELETE_COMMENTS_JSON = { "comments": [] };
let images = []; // FOR STORING THE DATA
//------------------------------------------------------------------------------------------
// this for saving new comment
router.post('/comments/:imageId', (req, res) => {
    const newComment = {"name": req.body.name, "text": req.body.text};
    const imageId = req.params.imageId;
    // check if all the parameters are valid and validate the comment input
    checkBeforeAdd(newComment, imageId, res);
    // give id to the new comment - date + name + random number
    newComment.id = Date.now() + newComment.name + Math.floor(Math.random() * MAX_RAND);

    let image = getImage(imageId);
    if (image) {
        if (!image.comments) {
            image.comments = [];
        }
        image.comments.push(newComment);
    } else {
        // not found - insert new image with its comment
        images.push(
            {
                "imageId": imageId,
                "comments": [newComment]
            });
    }// return id to comment
    res.json({"id": newComment.id});
})
// for submit login form and checking if client send valid name
router.post('/submit', (req, res) => {
    const name = {name: req.body.name};
    if (!name.name)
        res.status(INVALID).send('Name is not valid');
    // Validate the name
    if (validateName(name)) {
        res.json(name);
    } else {
        res.status(VALID).send(INVALID_NAME_MSG);
    }
});
// for getting all the comments of specific image
router.get('/comments/:imageId', (req, res) => {
    const imageId = req.params.imageId;
    checkParams(res, imageId);
    const image = getImage(imageId);
    if (!image)
        res.send('No comments for this image');
    else
        res.json({"comments": image.comments});
})
// for deleting comment
router.delete('/comments/:imageId/:id', (req, res) => {
    const imageId = req.params.imageId;
    const commentId = req.params.id;
    checkParams(res, imageId, commentId);
    const image = getImage(imageId);
    if (!image) {
        res.send('Image not found');
    } else {
        // delete the comment form the comments of the image
        if (image.comments) {
            if (image.comments.length > 0) {
                image.comments = image.comments.filter(comment => comment.id !== commentId);
                res.send('Comment deleted successfully');
            }
        } else {
            res.send('Comment deleted successfully2');
        }
    }
})
// For checking updates in client comments of specific image
router.post('/comments/updates/:imageId', (req, res) => {
    const imageId = req.params.imageId;
    const clientComments = req.body.comments;
    checkParams(res, clientComments, imageId);
    // Find the comments for the specified image id
    const image = getImage(imageId);
    // comments not found - return empty array(comments deleted)
    if (!image) {
        return res.json(DELETE_COMMENTS_JSON);
    }
    const updatedComments = image.comments;
    // check if the updated comments are equal to the client comments
    if (areEqual(updatedComments, clientComments)) {
        res.status(VALID);
    } else { // return the updated comments
        res.json({"comments": updatedComments});
    }
})
// this func for validating the name input
const validateName = (name) => (REGEX.test(name))
// this func for validating the comment input
const validateComment = (comment) => comment.length <= COMMENT_MAX_LEN && comment.length >= COMMENT_MIN_LEN;
// this function check if the comments are equal
const areEqual = (serverComments, clientComments) => JSON.stringify(clientComments) === JSON.stringify(serverComments);

// This func for checking if client send defined parameters
function checkParams(res, ...params) {
    params.some(param => {
        if (!param) {
            res.status(INVALID).send('Something went wrong with the parameters');
            return true;
        }
        return false;
    })
}
// this func to add comment we check if all ok and validate the comment
function checkBeforeAdd(newComment, imageId, res) {
    //check if all the parameters are valid
    checkParams(res, imageId, newComment, newComment.text, newComment.name)
    // validate the comment input and name
    if (!validateName(newComment.name)) {
        res.status(VALID).send(INVALID_NAME_MSG);
    }
    if (!validateComment(newComment.text)) {
        return res.status(VALID).send(COMMENT_INVALID_MSG);
    }
}
// this func for getting image by id from the images array
function getImage(imageId) {
    return images.find(image => image.imageId === imageId);
}

// handle 404 if page not founded
router.use((req, res) => {
    res.status(PAGE_NOT_FOUND).render('This page is not found');
})
module.exports = router;