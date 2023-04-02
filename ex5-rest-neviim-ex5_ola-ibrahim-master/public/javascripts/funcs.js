"use strict";
const NASA_API_KEY = "bgj2jrY5rBPFBJdWoNFuPwBU1lqFFpMNYxx6GQMh",
    NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";

const COMMENTS_URL = '/api/comments', CHECK_UPDATES_URL = '/api/comments/updates',
    HEADER = {"Content-Type": "application/json"},
    BEFORE_3DAYS = 2, NO_COPYRIGHT = "No copyright", UPDATE_TIMER = 15000,  // 15 seconds
    EMPTY = '',
    INVALID_COMMENT_MSG = 'Comment must be between 1-128 characters';
let NAME = ""; // name of the user
// ---------------------------------------------------------------------------------
// init module
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        managerModule.querySelect('#ajaxFormPost').addEventListener('submit', managerModule.postData);
        managerModule.querySelect('#ajaxDateFormGet').addEventListener('submit', managerModule.searchNasaPhotos);
        // set the date to today as value of the input form
        managerModule.setDateToday();
    });
})();
// ---------------------------------------------------------
// this module for managing the page
const managerModule = (function () {
    // this function for creating the html elem and add classes to it if needed
    const createNode = function (element, ...classes) {
        const node = document.createElement(element);
        if (classes && classes.length > 0) {
            node.classList.add(...classes);
        }
        return node;
    }
    // for getting icons from font awesome
    const icon = (iconName) => `<i class="fa fa-${iconName}"></i>`;
    const toggle = (element) => {
        element.classList.toggle('d-none');
    }
    const hide = (element) => {
        element.classList.add('d-none');
    }
    const show = (element) => {
        element.classList.remove('d-none');
    }
    const querySelect = (container) => document.querySelector(container);
    const appendChildrens = (parent, ...childrens) => {
        childrens.forEach((node) => parent.appendChild(node));
    }
    const json = (response) => response.json();

    // this function for check if the response is json
    function checkIfJson(response) {
        // Convert the response to a JSON object if it is not a message
        const contentType = response.headers.get("content-type");
        return (contentType && contentType.indexOf("application/json") !== -1) ? response.json() : {};
    }

    // -------------------------------image module-------------------------------------
    // this module for managing the image and contains all the functions for the image and class of comments
    /***
     *
     * @type {{createImgCard: (function(image(json), username(str)): imageElem)}}
     */
    const imageModule = (function () {
        const clearComments = (commentsElem) => {
            commentsElem.querySelectorAll('.comment').forEach(comment => comment.remove());
        }

        // this function for creating the image card
        function createImgCard(image, username) {
            // ----------------- create card elements -----------------
            const card = createNode('div', 'card', 'bg-dark', 'border-info');
            const cardBody = createNode('div', 'card-body', 'row');
            const title = createNode('h5', 'card-title', 'text-info');
            const descriptionSection = createNode('div', 'd-none', 'card-footer');
            const commentsSection = createNode('div', 'comments', 'd-none', 'card-footer');

            const bodyContent = createBodyContent(image, username, commentsSection, descriptionSection);
            const resource = image.media_type === 'image' ? createImage(image.url) : createVideo(image.url);
            // ------------------- init attributes -------------------
            card.id = image.date;
            title.innerHTML = ` ${image.title}`;
            descriptionSection.innerHTML = `<p>${image.explanation}</p>`;
            //------------------- append elements ------------------
            appendChildrens(cardBody, resource, bodyContent);
            appendChildrens(card, title, cardBody, commentsSection, descriptionSection);
            return card;
        }

        function createVideo(videoSrc) {
            const videoElem = createNode('iframe', 'card-video', 'col-6');
            videoElem.src = videoSrc;
            videoElem.width = videoElem.height = "100%";
            return videoElem;
        }

        // create an image element and adding a link to the image
        function createImage(imageSrc) {
            const img = createNode('img', 'img-fluid', 'card-img');
            const aElem = createNode('a', 'col-md-6');
            aElem.href = img.src = imageSrc;
            appendChildrens(aElem, img);
            return aElem;
        }

        //Export comments from the image card
        function getCommentsOfImg(commentsElem) {
            let comments = [];
            commentsElem.querySelectorAll('.comment').forEach(comment => {
                comments.push(
                    {
                        "name": comment.querySelector('.comment-name').innerHTML.split('_')[1],// remove @_ from the name
                        "text": comment.querySelector('.comment-text').innerHTML,
                        "id": comment.id
                    })
            });
            return comments;
        }

        // create comment object and saving it in the server (get comments from server)
        function newComment(text, name, imageId) {
            const newComment = new Comment(text, name, imageId);
            newComment.save();
            return newComment.createCommentElement();
        }

        // create comment object without saving it in the server (get comments from server)
        const getHtmlComment = (comment, imageId) => {
            return new Comment(comment.text, comment.name, imageId, comment.id).createCommentElement();
        }
        const insertBefore = (newNode, referenceNode) => {
            referenceNode.parentNode.insertBefore(newNode, referenceNode);
        }

        // this function for getting comments from the server
        function getComments(commentsElem, imageId) {
            // Add the id parameter to the params object
            fetch(`${COMMENTS_URL}/${imageId}`)
                .then(status)
                .then(checkIfJson) // Check if the response is a JSON object
                .then(data => {
                    if (data.comments)
                        initComments(data.comments, commentsElem, imageId);
                }).catch(error => console.log('Error:', error));
        }

        // this function for init the comments if updated
        function updateComments(updatedComments, commentsElem, imageId) {
            // remove all the comments - just comment form
            clearComments(commentsElem);
            initComments(updatedComments, commentsElem, imageId);
        }

        // this function for init the comments in the image card
        function initComments(commentsData, commentsElem, imageId) {
            if (checkIfIterable(commentsData) && commentsData.length > 0) {
                console.log('update', commentsData);
                // init the comments
                commentsData.forEach(comment => {
                    insertBefore(getHtmlComment(comment, imageId), commentsElem.querySelector('form'));
                });
            }
        }

        // this function for checking if its an iterable object
        function checkIfIterable(updatedComments) {
            return updatedComments && Array.isArray(updatedComments);
        }

        // this function for checking if there is an update in the comments in server
        function checkUpdates(imageId, commentsElem) {
            // Get the current comments from the page
            const comments = getCommentsOfImg(commentsElem);
            // Send an HTTP POST request to the server with the comments
            fetch(`${CHECK_UPDATES_URL}/${imageId}`, {
                method: "POST",
                headers: HEADER,
                body: JSON.stringify({comments})
            })
                .then(status)
                .then(checkIfJson)
                .then(data => {
                    // Get the updated comments from the server
                    if (data.comments) {
                        const updatedComments = data.comments;
                        updateComments(updatedComments, commentsElem, imageId);
                    }
                })
                .catch(err => {
                    console.error(err);
                });
        }

        // for creating 2 buttons for the image card
        function createButtons(commentsSection, descriptionSection, imageId) {
            const showDescriptionBtn = createNode('button', 'btn', 'btn-outline-primary', 'col');
            const showCommentsBtn = createNode('button', 'btn', 'btn-outline-secondary', 'mx-1', 'col');
            const buttons = createNode('div', 'row', 'mt-2');
            showCommentsBtn.innerHTML = '<i class="fas fa-comments">Comments</i>';
            showDescriptionBtn.innerHTML = '<i class="fa fa-info">nfo</i>';
            appendChildrens(buttons, showDescriptionBtn, showCommentsBtn);
            let firstClick = true;// for GET request if first time - no checking updates needed
            showCommentsBtn.addEventListener('click', () => {
                toggle(commentsSection);
                let myInterval;
                // if the comments section is visible
                if (!commentsSection.classList.contains('d-none')) {
                    if (firstClick) {
                        firstClick = false;
                        getComments(commentsSection, imageId);
                    }
                    hide(descriptionSection);
                    myInterval = setInterval(() => {
                            checkUpdates(imageId, commentsSection)
                        }
                        , UPDATE_TIMER);
                }
                if (!firstClick) // if myInterval is defined
                    clearInterval(myInterval);

            })
            showDescriptionBtn.addEventListener('click', () => {
                toggle(descriptionSection);
                hide(commentsSection);
            })
            return buttons;
        }

        // create form for adding new comment
        function createCommentForm(username, imageId) {
            const form = createNode('form', 'form-group');
            const textArea = createNode('textarea', 'form-control', 'mb-1', 'mr-1');
            textArea.placeholder = 'Write a comment...';
            textArea.rows = 1;
            const submit = createNode('button', 'btn', 'btn-primary');
            submit.type = 'submit';
            submit.innerHTML = `<i class="fa fa-paper-plane"></i>`;
            appendChildrens(form, textArea, submit);
            // add spaces text aria and the form and the button
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const comment = textArea.value;
                if (validationModule.validateComment(comment)) {
                    hide(form.nextElementSibling);
                    const commentElem = newComment(comment, username, imageId);
                    // add commentElem before post form
                    form.parentNode.insertBefore(commentElem, form);
                    form.reset();
                } else
                    show(form.nextElementSibling);
            })
            return form;
        }

        // create comment body element
        function createBodyContent(image, username, commentsSection, descriptionSection) {
            const info = createNode('div', 'col-md-6');
            const copyRight = createNode('p');
            const buttons = createButtons(commentsSection, descriptionSection, image.date);
            const errorMessages = createNode('p', 'text-danger', 'd-none', 'error-messages');
            const postComment = createCommentForm(username, image.date);
            const dateElem = createNode('p');
            // ----------------- add content to the elements -----------------
            dateElem.innerHTML = `${icon('calendar')} ${image.date}`;
            errorMessages.innerHTML = INVALID_COMMENT_MSG;
            copyRight.innerHTML = `${icon('camera')} ${image.copyright ?? NO_COPYRIGHT}`;
            // ----------------- append elements to the info div -----------------
            appendChildrens(commentsSection, postComment, errorMessages,);
            appendChildrens(info, dateElem, copyRight, buttons);
            return info;
        }

        // class for comments
        const Comment = class Comment {
            // write comment and declare parameters for this class with /***/
            /***
             *
             * @param text: comment text
             * @param name: name of the user
             * @param imageId: id of the image(date of the image)
             * @commentId: id of the comment that we get from the server
             */
            constructor(text, name, imageId, id) {
                this.text = text;
                this.name = name;
                this.imageId = imageId;
                this.id = id ?? EMPTY;// we got this id from the server
            }

            // save comment in the server
            save() {
                const data = {
                    "text": this.text, "name": this.name
                };
                fetch(`${COMMENTS_URL}/${this.imageId}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                })
                    .then(status)
                    .then(checkIfJson)
                    .then((data) => {
                        // set the id of the comment that we get from the server
                        this.id = data.id;
                        console.log('id', this.id);
                    }).catch((err) => {
                    console.error(err.message);
                });
            }

            // delete comment from the server
            deleteComment(commentElem) {
                // delete comment from the server
                fetch(`${COMMENTS_URL}/${this.imageId}/${this.id}`, {
                    method: 'DELETE'
                }).then(status)
                    .then((data) => {
                        commentElem.remove();
                        // delete the class object(this)
                        delete this;
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }

            // create comment element
            createCommentElement() {
                const comment = createNode('div', 'comment', 'border', 'border-info', 'rounded', 'shadow', 'p-2', 'm-2');
                const commentText = createNode('small', 'comment-text');
                const commentName = createNode('span', 'comment-name', 'text-primary', 'fw-bold', 'me-2', 'label', 'bg-info', 'bg-gradient', 'rounded', 'p-1', 'bg-info');
                commentText.innerHTML = this.text;
                commentName.innerHTML = `@_${this.name} `;
                // if the current user is the owner of the comment - add remove button
                appendChildrens(comment, commentName, commentText);
                if (NAME === this.name) {
                    const commentDelete = createNode('btn', 'btn-danger', 'btn-sm', 'float-end', 'fas', 'fa-trash-alt', 'comment-delete');
                    commentDelete.addEventListener('click', () => {
                        this.deleteComment(comment);
                    });
                    comment.appendChild(commentDelete);
                }
                comment.id = this.id;
                return comment;
            }
        }
        // ------------------ end of class Comment ------------------
        // module returns
        return {
            createImgCard: createImgCard,
        }
    })();

    function status(response) {
        if (response.status >= 200 && response.status < 300) {
            return Promise.resolve(response)
        } else {
            return Promise.reject(new Error(response.statusText))
        }
    }

    // get 3 day before the current date
    const getDayBefore = (date, days) => {
        let newDate = new Date(date);
        newDate.setDate(newDate.getDate() - days);
        // Format the date to yyyy-mm-dd
        return newDate.toISOString().slice(0, 10);
    }
    function createImagesInHtml(imagesDivElem, images, loadingElem) {
        if (images && images.length > 0) {
            images.sort((a, b) => a.date < b.date ? 1 : -1);
            images.forEach(image => imagesDivElem.appendChild(imageModule.createImgCard(image, NAME)));
        }
        hide(loadingElem)
    }
    // search nasa images by given date from the server
    function searchNasaPhotos(event) {
        event.preventDefault();
        const imagesElem = querySelect('#nasa-images');
        hide(imagesElem.nextElementSibling);
        const loadingElem = querySelect('#loading');
        let end_date = querySelect('#date').value;
        let start_date = getDayBefore(end_date, BEFORE_3DAYS);
        // Clear images
        imagesElem.innerHTML = EMPTY;
        let hasMoreImages = true;
        // show loading gif until getting images
        loadMoreImages();
        // check if we are at the end of the page and load more images
        window.onscroll = function () {
            if (hasMoreImages) {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
                    loadMoreImages();
                }
            }
        }
        // load more images if there is more images in given range(date, before 3 days)
        function loadMoreImages() {
            show(loadingElem);
            if (validationModule.validateDates(start_date, end_date)) {
                fetch(`${NASA_APOD_URL}?api_key=${NASA_API_KEY}&start_date=${start_date}&end_date=${end_date}`)
                    .then(status)
                    .then(json)
                    .then((images) => {
                        createImagesInHtml(imagesElem, images, loadingElem);
                        // next 3 days before the current date for next request
                        end_date = getDayBefore(start_date, 1);
                        start_date = getDayBefore(end_date, BEFORE_3DAYS);
                    })
                    .catch((error) => {
                        if (!imagesElem.hasChildNodes())
                            show(imagesElem.nextElementSibling);
                        hasMoreImages = false;
                    });
                hide(loadingElem);
            }
        }
    }
    // post the name form to the server for checking validation and save the name in global variable
    function postData(event) {
        event.preventDefault();
        const name = document.querySelector('#name').value;
        fetch("/api/submit", {
            method: "POST",
            headers: HEADER,
            body: JSON.stringify({"name": name})
        }).then(status)
            .then(json)
            .then(data => {
                NAME = data.name;
                hide(this.parentNode);
                document.querySelector('#user').innerHTML = NAME;
                const instructionPage = querySelect('#instruction-page');
                show(instructionPage);
                instructionPage.querySelector('#nextButton').addEventListener('click', () => {
                    hide(instructionPage);
                    show(querySelect('#nextPage'))
                });
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    const setDateToday = () => {
        const today = new Date();
        querySelect('#date').value = today.toISOString().substr(0, 10);
    }
    return {
        postData,
        setDateToday,
        searchNasaPhotos,
        querySelect,
        icon
    }
})
();
//-------------------------- validationModule ------------------------------------
const validationModule = (function () {
    const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const [MIN_COMMENT_LEN, MAX_COMMENT_LEN] = [1, 128]

    function validateDate(date) {
        return REGEX_DATE.test(date);
    }

    const validateDates = (start_date, end_date) => (start_date && end_date && start_date <= end_date && validateDate(start_date) && validateDate(end_date));
    const validateComment = (comment) => comment && comment.length <= MAX_COMMENT_LEN && comment.length >= MIN_COMMENT_LEN;
    return {
        validateDates: validateDates,
        validateComment: validateComment
    }
})();

