const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

const trelloKey = core.getInput("trello-key", { required: true });
const trelloToken = core.getInput("trello-token", { required: true });
const boardID = core.getInput("board-id", { required: true });
const listID = core.getInput("list-id", { required: true });

const trelloClient = axios.create({
  baseUrl: "https://api.trello.com",
});

const requestTrello = async (verb, url, body = null, extraParams = null) => {
  try {
    const params = {
      ...(extraParams || {}),
      key: trelloKey,
      token: trelloToken,
    };

    const res = await trelloClient.request({
      method: verb,
      url: url,
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
  return requestTrello("get", `/1/search`, {
    query: branchName,
    idBoards: [boardID],
    partial: true,
  });
};

const moveCard = async (cardID, listID) => {
  return requestTrello("put", `/1/cards/${cardID}`, {
    idList: listID,
  });
};

let branchName = github.context.ref;
console.log(branchName);

branchName = branchName.split("/");
branchName = branchName[branchName.lenght - 1];

console.log()(async () => {
  try {
    if (!(github.context.eventName === "create")) {
      core.info(`event not supported, skipping action.`);
      return;
    }

    card = await getCard(branchName);
    await moveCard(card.id, listID);
  } catch (error) {
    core.error(util.inspect(error));
    //failure will stop PR from being mergeable if that setting enabled on the repo.  there is not currently a neutral exit in actions v2.
    core.setFailed(error.message);
  }
})();
