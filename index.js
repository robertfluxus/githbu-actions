const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const util = require("util");

const trelloKey = core.getInput("trello-key", { required: true });
const trelloToken = core.getInput("trello-token", { required: true });
const boardID = core.getInput("board-id", { required: true });
const listID = core.getInput("list-id", { required: true });

const requestTrello = async (verb, url, body = null, extraParams = null) => {
  try {
    const params = {
      ...(extraParams || {}),
      key: trelloKey,
      token: trelloToken,
    };

    const res = await axios({
      url: `https://api.trello.com${url}`,
      method: verb,
      data: body || {},
      params: params,
    });

    core.debug(
      `${verb} to ${url} completed with status: ${res.status}.  data follows:`
    );
    //BRH NOTE core.xxx logging methods explode with typeerror when given non-string object.  TODO wrap.
    core.debug(util.inspect(res.data));
    return res.data;
  } catch (err) {
    core.error(`${verb} to ${url} errored: ${err}`);
    if (err.response) {
      core.error(util.inspect(err.response.data));
    }
    throw err;
  }
};

const getCard = async (branchName) => {
  return requestTrello("get", `/1/search`, null, {
    query: `name:"${branchName}"`,
    idBoards: [boardID],
    modelTypes: "cards",
    partial: true,
  });
};

const moveCard = async (cardID, listID) => {
  return requestTrello("put", `/1/cards/${cardID}`, {
    idList: listID,
  });
};

let branchName = github.context.ref;

branchName = branchName.split("/");
branchName = branchName[branchName.length - 1];

const run = async () => {
  try {
    if (!(github.context.eventName === "create")) {
      core.info(`event not supported, skipping action.`);
      return;
    }

    card = await getCard(branchName);
    console.log(card);
    await moveCard(card.cards[0].id, listID);
  } catch (error) {
    core.error(util.inspect(error));
    //failure will stop PR from being mergeable if that setting enabled on the repo.  there is not currently a neutral exit in actions v2.
    core.setFailed(error.message);
  }
};

run();
