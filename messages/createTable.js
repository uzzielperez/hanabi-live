'use strict';

// Sent when the client clicks the "Create Game" button
// "data" example:
/*
    {
        name: "",
        max: 5,
        variant: 0,
        allow_spec: false,
        timed: false,
    }
*/

// Imports
const globals  = require('../globals');
const logger   = require('../logger');
const models   = require('../models');
const messages = require('../messages');
const notify   = require('../notify');

exports.step1 = function(socket, data) {
    // Prepare the data to feed to the model
    if (data.name === '') {
        data.name = `${socket.username}'s game`;
    }
    data.owner = socket.userID;

    // Validate that they submitted a table name
    if ('name' in data === false) {
        logger.warn(`User "${data.username}" created a table without sending a table name.`);

        // Let them know
        socket.emit('message', {
            type: 'denied',
            resp: {
                reason: 'You must submit a table name.',
            },
        });

        return;
    }

    // Validate that the username is not blank
    if (data.name.length === 0) {
        logger.warn(`User "${data.username}" created a table with a blank table name.`);

        // Let them know
        socket.emit('message', {
            type: 'denied',
            resp: {
                reason: 'The table name cannot be blank.',
            },
        });

        return;
    }

    // Validate that the game name is not excessively long
    let maxLength = 30;
    if (data.name.length > maxLength) {
        logger.warn(`User "${data.username}" supplied an excessively long table name with a length of ${data.name.length}.`);

        // Let them know
        socket.emit('message', {
            type: 'denied',
            resp: {
                reason: `The table name must be ${maxLength} characters or less.`,
            },
        });

        return;
    }

    // Create the table
    models.games.create(socket, data, step2);
};

function step2(error, socket, data) {
    if (error !== null) {
        logger.error('Error: models.games.create failed:', error);
        return;
    }

    logger.info(`User "${socket.username}" created a new game: #${data.gameID} (${data.name})`);

    // Keep track of the current games
    globals.currentGames[data.gameID] = {
        actions:           [],
        allow_spec:        data.allow_spec,
        clue_num:          8,
        deck:              [],
        deckIndex:         0,
        end_turn_num:      null,
        max_players:       data.max,
        name:              data.name,
        num_spec:          0,
        owner:             socket.userID,
        players:           [],
        running:           false,
        score:             0,
        seed:              null,
        spectators:        {},
        stacks:            [],
        strikes:           0,
        sound:             null,
        timed:             data.timed,
        turn_begin_time:   null,
        turn_num:          0,
        turn_player_index: 0,
        variant:           data.variant,
    };

    notify.allTableChange(data);

    // Join the user to the new table
    data.table_id = data.gameID;
    messages.join_table.step1(socket, data);
}
