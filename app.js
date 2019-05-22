const hbs = require('hbs');
const express = require('express');
const bodyParser = require('body-parser');
const backend = require('./backend');
const firebase = require('firebase');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const path = require('path');
const port = process.env.PORT || 8080;

var app = express();


var config = {
    apiKey: "AIzaSyDOvbL8GIvalFiVeUKmdEL5N7Dv6qzPk-w",
    authDomain: "bigorsmall-9c0b5.firebaseapp.com",
    databaseURL: "https://bigorsmall-9c0b5.firebaseio.com",
    projectId: "bigorsmall-9c0b5",
    storageBucket: "bigorsmall-9c0b5.appspot.com",
    messagingSenderId: "369969153728"
};
firebase.initializeApp(config);

var rootRef = firebase.database().ref();

app.listen(port, () => {
    console.log(`Server is up on the port ${port}`)
});

app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, '/public')));
app.use('/', express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cookieParser());

app.use(
    session({
        secret: "secretcode",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: true
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

var deck = 0;
var card = 0;
var card2 = 0;
var cardback = "/img/cardbacks/red_cardback.png";
var music = "";
var score = 0;
var current_user = undefined;
var nav_email = "Guest";
var balance = undefined;

/*****************************************************************************

 START - HBS REGISTER

 ******************************************************************************/

hbs.registerPartials(path.join(__dirname, '/views/partials'));

hbs.registerHelper('breaklines', function (text) {
    text = hbs.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new hbs.SafeString(text);
});

hbs.registerHelper('getCurrentYear', () => {
    return new Date().getFullYear();
});

/*****************************************************************************

 END - HBS REGISTER

 ******************************************************************************/





/*****************************************************************************

START - NAVIGATIONS

******************************************************************************/
/*
    Make RESTFUL GET request and render the homepage of the BigOrSmall Game.
    It is also the registration page.
 */
app.get('/', function (request, response) {
    response.render('register.hbs', {
        title: 'Big or Small | Registration',
        nav_email: nav_email,
        balance : balance
    })
});

/*
    Register Page Add Account Endpoint
 */
app.post('/register', async (request, response) => {
    try {
        var email = request.body.email;
        var password = request.body.password;
        var fname = request.body.fname;
        var lname = request.body.lname;
        var result = await backend.addAccount(email, password, fname, lname);
        response.render('register.hbs', {
            title: 'Big or Small | Registration',
            success: result.success,
            failed: result.failed,
            nav_email: nav_email,
            balance: balance
        })
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});

//test
/*
    Make RESTFUL POST request and signout. Render login screen.
 */
app.post('/signout', async (request, response) => {
    current_user = undefined

    await firebase.auth().signOut()
        .then(function () {
            // Sign-out successful.
            nav_email = 'Guest';
            balance = undefined;
            cardback = "/img/cardbacks/red_cardback.png";
            music = "";
        }).catch(function (error) {
            // An error happened.
        });

    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email,
        balance: balance
    })
});

/*
    Make RESTFUL GET request and render the login screen to
    proceed to the game.
 */
app.get('/login', (request, response) => {
    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email,
        balance: balance
    })
});
/*
    Make RESTFUL GET request, render the screen and display all
    existing players with their personal high scores
 */
app.get('/rankings', async (request, response) => {
    try {
        var big_or_small_scores = await backend.getHighScores('big_or_small');
        big_or_small_str = await backend.highScoreString(big_or_small_scores);

        var joker_scores = await backend.getHighScores('joker');
        joker_str = await backend.highScoreString(joker_scores);

        var cardbomb_scores = await backend.getHighScores('cardbomb');
        cardbomb_str = await backend.highScoreString(cardbomb_scores);

        var match_scores = await backend.getHighScores('match');
        match_str = await backend.highScoreString(match_scores);

        response.render('rankings.hbs', {
            title: 'Rankings',
            bos_rankings: big_or_small_str,
            joker_rankings: joker_str,
            cardbomb_rankings: cardbomb_str,
            match_rankings: match_str,
            nav_email: nav_email,
            balance: balance
        })
    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e.message)
    }
});


/*
    Make RESTFUL GET request and render game
 */
app.get(`/gameportal`, async (request, response) => {
    response.render('gameportal.hbs', {
        title: 'Big or Small | Game Portal',
        nav_email: nav_email,
        balance: balance
    })
});

/*****************************************************************************

END - NAVIGATIONS

******************************************************************************/





/*****************************************************************************

START - STORE

******************************************************************************/

/*
    Make RESTFUL GET request and render game
 */
app.get(`/store`, async (request, response) => {
    response.render('store.hbs', {
        title: 'Big or Small | Store',
        nav_email: nav_email,
        balance: balance
    })
});





/*
    Make RESTFUL GET request and render game
 */
app.post(`/buy`, async (request, response) => {
    message = "Please Login First";
    item_info = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.buyItem(current_user.uid, item_info[0], item_info[1], item_info[2], parseInt(item_info[3], 10));
    }
    if (balance >= parseInt(item_info[3], 10)){
        balance -= parseInt(item_info[3], 10);
    }
    if(message.startsWith('Purchased!')){
        message = `<div class="alert bg-success col-lg-12 col-lg-offset-1 text-center" role="alert" style="display: hidden;">
                    <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
                    <strong>${message}</strong>
                </div>`;

    }else{
        message = `<div class="alert bg-danger col-lg-12 col-lg-offset-1 text-center" role="alert" style="display: hidden;">
                    <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
                    <strong>${message}</strong>
                </div>`;
    }
    response.render('store.hbs', {
        title: 'Big or Small | Store',
        result: message,
        nav_email: nav_email,
        balance: balance
    })
});

/*****************************************************************************

END - STORE

******************************************************************************/





/*****************************************************************************

START - PROFILE(S) 

******************************************************************************/

app.get('/profile/:email', async (request, response) => {
    var test = {};
    var id = request.params.email
    renderProfile(id, request, response);
});


app.get(`/profile`, async (request, response) => {
    var test = {};
    if (current_user != undefined) {
        renderProfile(current_user.uid, request, response);
    } else {
        await response.render('login.hbs', {
            title: 'Big or Small | Login',
            failed: 'Login first to view account status',
            nav_email: nav_email,
        })
    }
});

app.post(`/avatar`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'profile_picture')
        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
    }
});

app.post(`/music`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'music')
        test = await backend.retrieveUserData(current_user.uid)
        music = test.music.url;

        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
    }
});

app.post(`/cardback`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'cardback')
        test = await backend.retrieveUserData(current_user.uid)
        cardback = test.cardback.url;
        
        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
    }
});

async function renderProfile(user_id, request, response) {
    var user_info = {};
    try{
        if (user_id != undefined) {
            user_info = await backend.retrieveUserData(user_id);
            user_info.profile_picture = `src="${user_info.profile_picture.url}"`
            if (current_user != undefined){
                if(current_user.uid == user_id){
                    //SELF VIEW
                    nav_email = user_info.email;
                    user_info.nav_email = user_info.email;
                    balance = user_info.balance;
                    user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'','profile_pictures');
                    user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'','music');
                    user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'cardback');
                }else{
                    //OTHER USERS VIEW
                    user_info.nav_email = nav_email;
                    user_info.balance = balance;
                    user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'display: none;','profile_pictures');
                    user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'display: none;', 'music');
                    user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'display: none;', 'cardback');   
                } 
            }else{
                //GUEST VIEW
                user_info.nav_email = 'Guest';
                user_info.balance = undefined;
                user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'display: none;', 'profile_pictures');
                user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'display: none;', 'music');
                user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'display: none;', 'cardback');
            }
        }
        user_info.title = `Big or Small | Profile`;

        await response.render('profile.hbs', user_info)
    }catch(error){
        response.render('error.hbs',{
            error: error
        })
    }
}

async function arrObjToHTMLString(array, not_user, type){
    html_string = ""

    array.forEach((element, index, array) => {
            if (index % 2 == 0) {
                html_string += `<div class="row">\n`
            }
            var item = element.name + ',' + element.url
            html_string += `    <div class="card-body col-6">\n`
            if(type != 'music'){
                html_string += `        <img src="${element.url}" alt="default"\n`
                html_string += `        style="max-width: 80%; height: auto">\n`
            }else{
                html_string += `        <img src="https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/PicklesCarnival.jpg?alt=media&token=88a4de84-3b22-4237-a1b9-c5f3a68dc0f5" alt="default"\n`
                html_string += `        style="max-width: 100%; height: auto">\n`
                html_string += `<p style="max-width: 100%; height: auto">${element.name}</p>`
            }

            html_string += `        <button class="btn wide-btn btn-info" name="url" value="${element.name},${element.url}" style="${not_user}">Use this!</button>\n`
            html_string += `    </div>\n`

            if (index % 2 == 1) {
                html_string += `</div>\n`
            }
        })

    if(array.length % 2 == 1){
        html_string += `</div>\n`
    }

    return html_string
}
/*****************************************************************************

END - PROFILE(S)

******************************************************************************/





/*****************************************************************************

START - BIG OR SMALL GAME

 ******************************************************************************/

/*
    Make RESTFUL POST request and start game as player with
    login information. Disables game feature until it is started.
 */
app.post('/game', async (request, response) => {
    try {
        var email = request.body.email;
        var password = request.body.password;
        var login = await backend.loginAccount(email, password, request, response);
        if (login.failed == "") {

            current_user = login.current_user;
            nav_email = current_user.email;
            balance = current_user.balance;
            cardback = current_user.cardback.url;
            music = current_user.music.url;
            deck = login.deck;
            console.log(`current user: ${current_user.email}`);
            await renderProfile(current_user.uid, request, response);
        } else {
            response.render('login.hbs', {
                title: 'Big or Small | Login',
                failed: login.failed,
                nav_email: nav_email,
            })
        }
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});

/*
    Make RESTFUL POST request, render a new game with a reshuffled deck
    and new scores
 */
app.post('/newgame', async (request, response) => {
    score = 0;

    try {
        deck = await backend.shuffleDeck(deck.deck_id);
        card = await backend.drawDeck(deck.deck_id, 1);
        card2 = await backend.drawDeck(deck.deck_id, 1);
        renderBigOrSmall(request, response, "", card.cards[0].image, cardback, card.remaining, "")
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});


/*
    Make RESTFUL POST request and determine results if player picked
    next card as BIGGER than the current card. Display results based
    on outcome. Will also save better high scores.
 */
app.post('/bigger', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) < getNumeric(card2.cards[0].value)) {
            bigOrSmallCorrect(1, request, response);
        } else {
            bigOrSmallWrong(request, response);
        }
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});

/*
    Make RESTFUL POST request and determine results if player picked
    next card as TIE. Display results based on outcome. Will also
    save better high scores.
 */
app.post('/tie', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) === getNumeric(card2.cards[0].value)) {
            bigOrSmallCorrect(4, request, response);

        } else {
            bigOrSmallWrong(request, response);
        }
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});


/*
    Make RESTFUL POST request and determine results if player picked
    next card as SMALLER than the current card. Display results based
    on outcome. Will also save better high scores.
 */
app.post('/smaller', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) > getNumeric(card2.cards[0].value)) {
            bigOrSmallCorrect(1, request, response);
        } else {
            bigOrSmallWrong(request, response);
        }
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});


/*
    Convert Card strings and return appropriate corresponding values
 */
function getNumeric(card) {
    var trimmed = card.trim()
    if (trimmed === "KING") {
        return 13
    } else if (trimmed === "QUEEN") {
        return 12
    } else if (trimmed === "JACK") {
        return 11
    } else if (trimmed === "ACE") {
        return 1
    } else {
        return parseInt(trimmed)
    }
}

async function bigOrSmallCorrect(weight, request, response) {
    score += weight;
    card = card2;
    card2 = await backend.drawDeck(deck.deck_id, 1);
    if (card2.remaining > 0) {
        renderBigOrSmall(request, response, "", card.cards[0].image, cardback, card.remaining, `Correct Guess!`);
    } else {
        var win_message = `Congratulations, you have finished the deck with ${score} point`;
        if (current_user !== undefined) {
            await backend.saveHighScore(current_user.uid, current_user.email, score, true, 'big_or_small');
            balance += score;
        }
        renderBigOrSmall(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
    }
}

async function bigOrSmallWrong(request, response) {
    var lose_message = `Sorry, you have lost with ${score} points`;
    if (current_user !== undefined) {
        lose_message = await backend.saveHighScore(current_user.uid, current_user.email, score, false, 'big_or_small');
        balance += score;
    }
    renderBigOrSmall(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
        lose_message);
    score = 0;
}

/*
    Renders the game screen with different display options based on parameters
 */
function renderBigOrSmall(request, response, state, first_card, second_card, remaining, game_state) {
    var name = "Guest";
    if (current_user !== undefined) {
        name = `${current_user.fname} ${current_user.lname}`;
    }
    response.render('game.hbs', {
        title: 'Big or Small | Play Game',
        card: first_card,
        card2: second_card,
        bigger: state,
        smaller: state,
        tie: state,
        score: score,
        remaining: remaining,
        name: name,
        game_state: game_state,
        nav_email: nav_email,
        balance: balance,
        music: music,
        cardback: cardback
    });
}

/*
    Make RESTFUL GET request and render game
 */
app.get(`/deck`, async (request, response) => {
    try {
        deck = await backend.getDeck(1);
        renderBigOrSmall(request, response, "disabled", cardback, cardback, deck.remaining, "");
    } catch (e) {
        response.render('error.hbs',{
            error: error
        })
        console.log(e)
    }
});

/*****************************************************************************

END - BIG OR SMALL GAME

 ******************************************************************************/





/*****************************************************************************

START - CARDBOMB GAME

 ******************************************************************************/

var cardbomb_game = null;
var cardbombs_array = [];
var cardbombs_array_images = [];
 
const cardbomb_obj = {
	state: "",
	main_card: null,
	deck_top: cardback,
	remaining: null,
	game_state: "",
}


app.get('/cardbomb', cardbomb);

app.get('/cardbomb_newgame', cardbombNewgame);

app.post('/cardbomb_raise', async (request, response) => {
	
    if (cardbomb_game == null) {
   	 cardbomb(request, response);
	 return;
    }

    try {
	    /*
        if (card == 0) {
            card = await backend.drawDeck(deck.deck_id, 1);
            cardbombRaise(request, response);
            return;
        } else {
	*/
	card = await backend.drawDeck(deck.deck_id, 1);

	console.log('checking for' + card.cards[0].code);

            if (cardbombs_array.indexOf(card.cards[0].code) < 0) {
                console.log('win')
                cardbombRaise(request, response);
            } else {
                console.log('lose')
                cardbombBoom(request, response);
            }
	    //include adwlkerj;l
    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
});

app.post('/cardbomb_leavegame', async (request, response) => {

    if (cardbomb_game == null) {
   	 cardbomb(request, response);
	 return;
    }

    try {
        cardbombLeave(request, response);
    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
});

async function cardbomb(request, response){
    try {
	let obj = cardbomb_obj;
	    obj.game_state = "Cick 'New Game' to start a new game of cardbomb!";
	    obj.main_card = cardback;
	    obj.state = "disabled";
	    obj.remaining = "";
	    obj.null_cards = false;

        renderCardbombGame(request, response, obj);
    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
}

function renderCardbombGame(request, response, obj) {
    /*
     * obj = {
     * 		state: disabled/"",
     * 		main_card: ,
     * 		deck_top: ,
     * 		remaining: ,
     * 		game_state: 
     * }
     */
    var name = "Guest";
    var login_msg = "";
    if (current_user !== undefined) {
        name = `${current_user.fname} ${current_user.lname}`;	
    } else {
    	login_msg = "please log in to save your scores";
    }

	//console.log(cardbomb_game);
	//console.log(cardbombs_array_images);
	//console.log(obj.game_state);

    if (cardbomb_game == null) {
   	cardbombs_array_images = []; 
    }

    if (!obj.hasOwnProperty('null_cards')) {
   	obj.null_cards = true; 
    }

    response.render('cardbomb.hbs', {
        title: 'Cardbomb | Play Game',
        card: obj.main_card,
        deck_top: obj.deck_top,
        score: score,
        remaining: obj.remaining,
        name: name,
        game_state: obj.game_state,
        nav_email: nav_email,
        balance: balance,
        music: music,
        cardback: cardback,
	login_msg: login_msg,
	cardbombs_array: cardbombs_array_images,
	cardbomb_raise: obj.state,
	cardbomb_leavegame: obj.state,
	null_cards: obj.null_cards
    });
}

async function randomizeBombs () {
	let tdeck = await backend.getDeck(1),
	    tcard,
	    tarray = [];

	cardbombs_array = [];
	cardbombs_array_images = [];

	for (var i = 0; i < 4; i++) {
		tcard = await backend.drawDeck(tdeck.deck_id, 1);

		cardbombs_array.push(tcard.cards[0].code);

		codes = ['H', 'D', 'S', 'C'];
		for (var j = 0; j < 4; j++) {
			let code = tcard.cards[0].code.charAt(0) + codes[j];
			cardbombs_array.push(code);
		}

		cardbombs_array_images.push(tcard.cards[0].image);
	}

	console.log(cardbombs_array);
	console.log(cardbombs_array_images);
}

async function cardbombNewgame(request, response){
    score = 0;

    try {
	await randomizeBombs();

	// shuffle a new deck and draw a new card but 
	// make sure the first card is not already selected as a bomb.
	do {
		deck = await backend.getDeck(1);
		deck = await backend.shuffleDeck(deck.deck_id);
		card = await backend.drawDeck(deck.deck_id, 1);	
	} while (cardbombs_array.indexOf(card.cards[0].code) >= 0);

	cardbomb_game = true;

	let obj = cardbomb_obj;
	    obj.game_state = "Starting a new game. Good luck!";
	    obj.main_card = card.cards[0].image;
	    obj.remaining = 51;
	    obj.state = "";
	    obj.null_cards = true;

        renderCardbombGame(request, response, obj);
    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
}

async function cardbombRaise(request, response) {
    var add = 0;

	console.log(request.body);

    //pick one of 5 different score multipliers based on the total number of cards drawn
    for (var n = 1; n < 6; n++){
        if ( (52 - card.remaining) <= (n * 10) ) {    //number of total cards drawn <= 12
            add = ((6 - n) * (52 - card.remaining));
            score += add;
            break;
        }
    } 

    let obj = cardbomb_obj;
	obj.main_card = card.cards[0].image;
	obj.remaining = card.remaining;
	
    if (card.remaining > 0) {
	obj.game_state = `Raising ${add}!`;

        renderCardbombGame(request, response, obj);
    } else {
        var win_message = `Congratulations, you have finished the deck with ${score} points`;
        if (current_user !== undefined) {

            win_message += await checkUserToSave('cardbomb', true, score);
            balance += score;
        }
	obj.game_state = win_message;
        renderCardbombGame(request, response, obj);
	cardbomb_game = null;
    }
}

async function nCardsBeforeNextBomb () {
	let n = 0;

	while (card.remaining > 0) {
		let next_card = await backend.drawDeck(deck.deck_id, 1);
		
		if ( cardbombs_array.indexOf(next_card.cards[0].code) < 0 ) {
			n++;
		} else {
			break;	
		}
	}

	return n;
}

async function cardbombBoom(request, response) {
    var lose_message = `BOOM! that was a CARDBOMB! `;

    if (current_user !== undefined) {

        lose_message += await checkUserToSave('cardbomb', false, 0);
    }

    let obj = cardbomb_obj;
	obj.state = "disabled";
	obj.main_card = card.cards[0].image;
	obj.remaining = card.remaining;
	obj.game_state = lose_message;

    renderCardbombGame(request, response, obj); 
    score = 0;
    cardbomb_game = null;
}

async function cardbombLeave(request, response) {
    let n = await nCardsBeforeNextBomb();
    let tscore = score;
    score = score - (5 * n);

    let message = `You have decided to leave with your winnings. ${n} cards remaining before next bomb. Your final score is ${tscore} - (${n} * 5) => ${score}.`;

    if (current_user !== undefined) {

        await checkUserToSave('cardbomb', true, score);
        balance += score;
    }

    let obj = cardbomb_obj;
	obj.state = "disabled";
	obj.main_card = card.cards[0].image;
	obj.remaining = card.remaining;
	obj.game_state = message;

    renderCardbombGame(request, response, obj);
    score = 0;
    cardbomb_game = null;
}

/*****************************************************************************

END - CARDBOMB GAME

******************************************************************************/


/*****************************************************************************

START - MATCH GAME

******************************************************************************/

var matchDeck = 0;
var matchHand = 0;
var match_cards = [];
var match_card_objs = [];
var matchOne = undefined;
var matchTwo = undefined;
var matchCardCount = 52;
var matchedCount = 0;
var matchTurnScore = matchCardCount * 3;


app.get('/match', async (request, response) => {
    try {

        match_card_objs = [];
        for(i = 0; i < matchCardCount; i++){
            match_card_objs.push({
                card: cardback
            });
        }

        message = "";
        renderMatch(request, response, "", matchTurnScore, message, match_card_objs)
    }
    catch (e){
        response.render('error.hbs',{
            error: e
        })
        console.log(e);
    }
});

app.post('/newMatch', async (request, response) => {
    try {
        resetMatchVariables();
        matchDeck = await backend.getDeck(1);
        matchHand = await backend.drawDeck(matchDeck.deck_id, matchCardCount);
        for(i = 0; i < matchCardCount; i++){
            match_card_objs.push({
                button: `<button class="btn btn-sm btn-light ${i + 1}" style="width: 90%; font-size: 14px" name="flip${i + 1}">Flip</button>\n`,
                button_id : i,
                card: cardback
            });
        }


        for(var i = 0; i<matchHand.cards.length; i++){
            match_cards.push(matchHand.cards[i])
        }

        match_cards = shuffle(match_cards);
        message = "";

        renderMatch(request, response, "", matchTurnScore, message, match_card_objs)

    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
});

/*
    REST POST - Game MATCH.HBS FLIP Cards to check if match with previous card
*/
app.post('/flip/:id', async (request, response) => {
    try{
        var card_id = request.params.id;
        matchTurnScore--;

        if(matchOne != undefined && matchTwo != undefined){

            //Flip non-match cards back down
            if(getNumeric(match_cards[matchOne].value) != getNumeric(match_cards[matchTwo].value)){
                match_card_objs[matchOne].button = `<button class="btn btn-sm btn-light ${matchOne + 1}" style="width: 90%; font-size: 14px" name="flip${matchOne + 1}">Flip</button>\n`
                match_card_objs[matchOne].card = cardback
                match_card_objs[matchTwo].button = `<button class="btn btn-sm btn-light ${matchTwo + 1}" style="width: 90%; font-size: 14px" name="flip${matchTwo + 1}">Flip</button>\n`
                match_card_objs[matchTwo].card = cardback
            }else{
                match_card_objs[matchOne].button = `<button class="btn btn-sm btn-light ${matchOne + 1}" style="width: 90%; font-size: 14px; visibility: hidden;" name="flip${matchOne + 1}">Flip</button>\n`
                match_card_objs[matchTwo].button = `<button class="btn btn-sm btn-light ${matchTwo + 1}" style="width: 90%; font-size: 14px; visibility: hidden;" name="flip${matchTwo + 1}">Flip</button>\n`
            }

            //Reset match values
            matchOne = undefined;
            matchTwo = undefined;
        }

        if(matchOne == undefined){
            //No first card
            matchOne = card_id;

        }else if(matchTwo == undefined){
            //No second card
            matchTwo = card_id;

            if(getNumeric(match_cards[matchOne].value) == getNumeric(match_cards[matchTwo].value)){
                matchedCount += 2;
            }
        }
        match_card_objs[card_id].button = `<button class="btn btn-sm btn-light ${card_id + 1}" style="width: 90%; font-size: 14px;border: red solid 2px;" disabled="true" name="flip${card_id + 1}">Flip</button>\n`
        match_card_objs[card_id].card = match_cards[card_id].image

        if (matchedCount == matchCardCount){
            message = await checkUserToSave('match', true, matchTurnScore);
            disableMatchCards();
            renderMatch(request, response, "disabled", matchTurnScore, message, match_card_objs)

        }else if (matchTurnScore == 0) {
            message = await checkUserToSave('match', false, matchTurnScore);
            disableMatchCards();
            renderMatch(request, response, "disabled", matchTurnScore, message, match_card_objs)
        } else {

            renderMatch(request, response, "", matchTurnScore, message, match_card_objs)
        }

    }catch(e){
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
});

/*
    Shuffles an array
*/
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

/*
    RENDER - Match.hbs
*/
function renderMatch(request, response, state, matchTurnScore, message, card_button_array) {
    response.render('match.hbs', {
        title: 'Match',
        state: state,
        matchDeck: matchDeck,
        matchTurnScore: matchTurnScore,
        message: message,
        card_button_array: card_button_array,
        nav_email: nav_email,
        balance: balance,
        music: music,
        cardback: cardback
    });
}

/*
    Reset Match Game variables
*/
function resetMatchVariables(){
    matchTurnScore = matchCardCount * 3;
    matchedCount = 0;
    match_card_objs = [];
    match_cards = [];
    matchOne = undefined;
    matchTwo = undefined;
}

/*
    Save highscore if is user or else get the proper error message
*/
async function checkUserToSave(game_name, won, score){
    message = ""
    if(current_user != undefined){
        message = await backend.saveHighScore(current_user.uid, current_user.email, score, false, game_name);
    }else{
        message = await backend.saveHighScore(undefined, undefined, score, won, game_name);
    }
    return message;
}

/*
    Disable all card flip functions for Match Game
*/
function disableMatchCards(){
    for(var i = 0; i < match_card_objs.length; i++){
        match_card_objs[i].button = `<button class="btn btn-sm btn-light ${i + 1}" style="width: 90%; font-size: 14px; visibility: hidden;" name="flip${i + 1}">Flip</button>\n`
        match_card_objs[i].card = match_cards[i].image
    }
}

/*****************************************************************************

END- MATCH GAME

******************************************************************************/




/*****************************************************************************

BEGIN- JOKER GAME

******************************************************************************/

//Joker Game Initial Values
var jokerDeck = 0;
var jokerHand = 0;
var joker_cards = [];
var jokerCardCount = 52;
var jokerTurnScore = jokerCardCount;
var card_param = []
var joker = "/img/joker.jpg";
var joker_replaced = 0;

/*
    REST GET - JOKER.HBS 
*/
app.get('/joker', async (request, response) => {
    try {

        card_param = [];
        joker_cards = [];

        //Initialize joker.hbs cards with player cardback

        for(i = 0; i < jokerCardCount; i++){
            card_param.push({
                card: cardback
            });
        }

        renderJoker(request, response, "disabled", jokerTurnScore, "", card_param)
    }
    catch (e){
        response.render('error.hbs',{
            error: e
        })
        console.log(e);
    }
});

/*
    REST POST - Start Game JOKER.HBS 
*/
app.post('/newjoker', async (request, response) => {
    try {
        card_param = [];
        joker_cards = [];
        jokerTurnScore = jokerCardCount;
        jokerDeck = await backend.getDeck(1);
        jokerHand = await backend.drawDeck(jokerDeck.deck_id, jokerCardCount);
        
        var jokercard = {"image": joker, "value": "JOKER"}

        for(var i = 0; i < jokerHand.cards.length; i++){
            joker_cards.push(jokerHand.cards[i])
        }
        joker_replaced = joker_cards.pop();
        console.log(joker_replaced);
        joker_cards.push(jokercard);
        shuffle(joker_cards)

        for (var i=0; i < joker_cards.length; i++){
            card_param.push({
                button: `<button class="btn btn-sm btn-light ${i+1}" style="width: 90%; font-size: 14px" name="jflip${i+1}">Flip</button>\n`,
                button_id: i,
                card: cardback
            })
        }

        renderJoker(request, response, "", jokerTurnScore, "", card_param)

    } catch (e) {
        response.render('error.hbs',{
            error: e
        })
        console.log(e)
    }
});

/*
    REST POST - Game JOKER.HBS FLIP Cards to see if joker
*/
app.post('/jflip/:id', async (request, response) => {

    var card_id = request.params.id;
    card_param[card_id].card = joker_cards[card_id].image
    card_param[card_id].button = `<button style="width: 90%; font-size: 14px; visibility: hidden;">jflip</button>\n`

    if (joker_cards[card_id].value == "JOKER") {
        //found joker

        message = await checkUserToSave('joker', true, jokerTurnScore);
        disableJokerCards();
        renderJoker(request, response, "disabled", jokerTurnScore, message, card_param);

    } else {
        //didnt find joker

        jokerTurnScore -= 1;
        if (jokerTurnScore == 0){
            //out of turns

            message = await checkUserToSave('joker', false, jokerTurnScore);
            disableJokerCards();
            renderJoker(request, response, "disabled", jokerTurnScore, message, card_param);
        }
        else{
            //Keep playing, next turn

            renderJoker(request, response, "", jokerTurnScore, "", card_param);
        }
    }
});

/*
    REST POST - Game JOKER.HBS Guess what the joker is
*/
app.post('/guessjoker', async (request, response) => {
    console.log(request.body.card);
    console.log(joker_replaced.code);

    if(joker_replaced.code == request.body.card){
        //Correct guess

        message = await checkUserToSave('joker', true, jokerTurnScore * 2);
        disableJokerCards();
        renderJoker(request, response, "disabled", jokerTurnScore, message, card_param);
        console.log('You guessed right');
    }else{
        //wrong Guess

        message = await checkUserToSave('joker', false, 0);
        disableJokerCards();
        renderJoker(request, response, "disabled", jokerTurnScore, message, card_param);
        console.log('You guessed wrong')
    }

});

/*
    RENDER - Joker.hbs
*/
function renderJoker(request, response, state, jokerTurnScore, message, card_button_array) {
    response.render('joker.hbs', {
        title: 'Joker',
        state: state,
        jokerDeck: jokerDeck,
        jokerTurnScore: jokerTurnScore,
        message: message,
        card_button_array: card_button_array,
    });
}

/*
    Disables All joker cards flip function, happens usually on win or on lose.
*/
function disableJokerCards(){
    for(var i = 0; i < card_param.length; i++){
        card_param[i].button = `<button style="width: 90%; font-size: 14px; visibility: hidden;">jflip</button>\n`
        card_param[i].card = joker_cards[i].image
    }
}


/*****************************************************************************

END- JOKER GAME

******************************************************************************/

module.exports = {
	checkUserToSave
};
