const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should;
const request = require('supertest');
chai.use(chaiHttp);
const app = require('../app.js');
const backend = require('../backend')

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}
//
// describe('GET /', function(){
//     this.timeout(10000);
//     it('it should load page', function(done){
//         wait(5000);
//         chai.request(app)
//             .get('/')
//             .end(function(err, res) {
//                 console.log(err);
//                 expect(res).to.have.status(200);
//                 done();
//             });
//       });
//  });
//
// chai.should();

dummy_accounts = {
	harry: {
		email: "crap_crap@crap.com",
		password: "UnHy`utkV{63;5[",
		fname: "Harry",
		lname: "Kane"
	},
	chris: {
		email: "chris@chris.com",
		password: "AsD7ss-HJ`tM}q~&",
		fname: "Chris",
		lname: "Johnson"
	}
};

describe("test registering an account", () => {
	it("testing with an existing email address... registration should fail.", async () => {
		assert((await backend.addAccount(dummy_accounts.harry.email,
						dummy_accounts.harry.password,
						dummy_accounts.harry.fname,
						dummy_accounts.harry.lname)).failed,
			"auth/email-already-in-use: the email address is already in use by another account.");
	});

	it("testing with an new email address... registration should succeed.", async () => {
		assert((await backend.addAccount(dummy_accounts.chris.email,
						dummy_accounts.chris.password,
						dummy_accounts.chris.fname,
						dummy_accounts.chris.lname)).success,
			"Successfully created account" + dummy_accounts.chris.email);
	});

});

describe("Test retrieving high scores from firebase", () => {
	it("Retrieving high scores... Result should be an array.", async () => {
		assert(Array.isArray(await backend.getHighScores("big_or_small")), true);
	});
});

describe("Testing login", () => {
	it("logging in with an existing account and correct credentials... login should succeed", async () => {
		assert((await backend.loginAccount(dummy_accounts.chris.email,
						dummy_accounts.chris.password, null, null)).current_user.email, dummy_accounts.chris.email);
	});

	it("logging in with wrong credentials... login should fail", async () => {
		assert((await backend.loginAccount(dummy_accounts.chris.email,
						"random_fake_password", null, null)).failed,
		"auth/wrong-password: The password is invalid or the user does not have a password.");
	});

});

describe("Deck tests", () => {
	it("testing drawing a new deck", async () => {
		assert((await backend.getDeck(13)).success, true);	
	});
});

var login = null;
var uid = null;

describe("Store tests", async () => {

	it("Test buying item with zero balance... should fail", async () => {
		login = await backend.loginAccount(dummy_accounts.chris.email, dummy_accounts.chris.password, null, null);
		uid = login.current_user.uid;

        	assert((await backend.buyItem(uid,
			'thanos',
			'https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/thanos.jpg?alt=media&token=d3ff7293-0ea9-4bae-805e-a7c59c7210ae',
			'profile_pictures', 500)),
			"Sorry, you do not have enough balance");
	});
	
	it("Test buying item with sufficient score... should work", async () => {
		console.log('adding fake free points to Chris\' profile');
		await backend.saveHighScore(uid, dummy_accounts.chris.email, 1500, true, 'big_or_small');

		assert((await backend.buyItem(uid,
			'thanos',
			'https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/thanos.jpg?alt=media&token=d3ff7293-0ea9-4bae-805e-a7c59c7210ae',
			'profile_pictures', 500)), "Purchased! 1500 - 500 = 1000");
	});

	it("Testing buying the same item again", async () => {
		assert((await backend.buyItem(uid,
			'thanos',
			'https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/thanos.jpg?alt=media&token=d3ff7293-0ea9-4bae-805e-a7c59c7210ae',
			'profile_pictures', 500)), "User already has thanos");
	
	});

	it("Testing using the newly purchased item", async () => {
		assert(await backend.changeProfile(uid, 'thanos', "https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/thanos.jpg?alt=media&token=d3ff7293-0ea9-4bae-805e-a7c59c7210ae", "profile_pictures"), "Successfully changed profile_pictures");
	});	
});

describe("Cardbomb playing as guest", async () => {

	it("Testing saving 10 cardbomb points win", async () => {
		assert((await app.checkUserToSave("cardbomb", true, 10)), "Win 10 pts, Guests cannot be part of the rankings.");
	});

	it("Testing saving 10 cardbomb points lose", async () => {
		assert((await app.checkUserToSave("cardbomb", false, 10)), "Lose 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 10 match points win", async () => {
		assert((await app.checkUserToSave('match', true, 10)), "Win 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 10 match points lose", async () => {
		assert((await app.checkUserToSave('match', false, 10)), "Lose 10 pts, Guests cannot be part of the rankings.");
	});

	it("Testing saving 20 joker points win", async () => {
		assert((await app.checkUserToSave('joker', true, 20)), "Win 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 20 joker points lose", async () => {
		assert((await app.checkUserToSave('joker', true, 20)), "Lose 10 pts, Guests cannot be part of the rankings.");	
	});

});

describe("Cardbomb playing as logged in user", async () => {

	it("Testing saving 10 cardbomb points win", async () => {
		assert((await app.checkUserToSave("cardbomb", true, 10)), "Win 10 pts, Guests cannot be part of the rankings.");
	});

	it("Testing saving 10 cardbomb points lose", async () => {
		assert((await app.checkUserToSave("cardbomb", false, 10)), "Lose 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 10 match points win", async () => {
		assert((await app.checkUserToSave('match', true, 10)), "Win 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 10 match points lose", async () => {
		assert((await app.checkUserToSave('match', false, 10)), "Lose 10 pts, Guests cannot be part of the rankings.");
	});

	it("Testing saving 20 joker points win", async () => {
		assert((await app.checkUserToSave('joker', true, 20)), "Win 10 pts, Guests cannot be part of the rankings.");		
	});

	it("Testing saving 20 joker points lose", async () => {
		assert((await app.checkUserToSave('joker', true, 20)), "Lose 10 pts, Guests cannot be part of the rankings.");
		await backend.deleteAccount();		
	});

});
